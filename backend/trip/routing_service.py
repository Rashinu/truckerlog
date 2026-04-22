"""
Geocoding + routing via OpenRouteService (free, no credit card required).
Falls back to estimated distance/duration if API fails.
"""

import requests
import math
from django.conf import settings

ORS_BASE = 'https://api.openrouteservice.org'
AVERAGE_SPEED_MPH = 55.0
KM_TO_MILES = 0.621371
SECONDS_TO_HOURS = 1 / 3600


def geocode(location: str) -> dict:
    """Return {lat, lon, label} for a location string."""
    url = f'{ORS_BASE}/geocode/search'
    params = {
        'api_key': settings.ORS_API_KEY,
        'text': location,
        'size': 1,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        features = data.get('features', [])
        if features:
            coords = features[0]['geometry']['coordinates']
            label = features[0]['properties'].get('label', location)
            return {'lon': coords[0], 'lat': coords[1], 'label': label}
    except Exception as e:
        print(f'Geocode error for "{location}": {e}')
    return _fallback_geocode(location)


def get_route(origin: dict, pickup: dict, dropoff: dict) -> dict:
    """
    Get driving route from origin→pickup→dropoff via ORS.
    Returns structured route data for HOS calculation.
    """
    url = f'{ORS_BASE}/v2/directions/driving-car'
    headers = {
        'Authorization': settings.ORS_API_KEY,
        'Content-Type': 'application/json',
    }
    coords = [
        [origin['lon'], origin['lat']],
        [pickup['lon'], pickup['lat']],
        [dropoff['lon'], dropoff['lat']],
    ]
    body = {
        'coordinates': coords,
        'instructions': False,
        'geometry': True,
        'units': 'mi',
    }

    try:
        r = requests.post(url, json=body, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        return _parse_ors_response(data, origin, pickup, dropoff)
    except Exception as e:
        print(f'ORS routing error: {e}')
        return _fallback_route(origin, pickup, dropoff)


def _parse_ors_response(data: dict, origin: dict, pickup: dict, dropoff: dict) -> dict:
    routes = data.get('routes', [])
    if not routes:
        return _fallback_route(origin, pickup, dropoff)

    route = routes[0]
    summary = route.get('summary', {})
    total_distance_miles = summary.get('distance', 0)
    total_duration_hours = summary.get('duration', 0) * SECONDS_TO_HOURS

    segments_raw = route.get('segments', [])
    segments = []
    for i, seg in enumerate(segments_raw):
        dist = seg.get('distance', 0)
        dur = seg.get('duration', 0) * SECONDS_TO_HOURS
        if i == 0:
            from_loc = origin.get('label', 'Origin')
            to_loc = pickup.get('label', 'Pickup')
        else:
            from_loc = pickup.get('label', 'Pickup')
            to_loc = dropoff.get('label', 'Dropoff')
        segments.append({
            'distance_miles': round(dist, 2),
            'duration_hours': round(dur, 4),
            'from_location': from_loc,
            'to_location': to_loc,
        })

    # Decode geometry (polyline encoding)
    geometry = route.get('geometry', '')
    waypoints = _decode_geometry(geometry) if geometry else []

    return {
        'total_distance_miles': round(total_distance_miles, 2),
        'total_duration_hours': round(total_duration_hours, 4),
        'segments': segments,
        'waypoints': waypoints,
        'origin': origin,
        'pickup': pickup,
        'dropoff': dropoff,
    }


def _decode_geometry(encoded: str) -> list:
    """Decode ORS polyline6 geometry string to list of [lat, lon]."""
    points = []
    index = 0
    lat = 0
    lng = 0
    precision = 1e-5

    while index < len(encoded):
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        points.append([lat * precision, lng * precision])

    return points


def _haversine_miles(lat1, lon1, lat2, lon2) -> float:
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fallback_geocode(location: str) -> dict:
    """Very rough coordinate lookup for common US cities."""
    known = {
        'dallas': (32.7767, -96.7970),
        'oklahoma city': (35.4676, -97.5164),
        'nashville': (36.1627, -86.7816),
        'houston': (29.7604, -95.3698),
        'chicago': (41.8781, -87.6298),
        'los angeles': (34.0522, -118.2437),
        'new york': (40.7128, -74.0060),
        'miami': (25.7617, -80.1918),
        'atlanta': (33.7490, -84.3880),
        'denver': (39.7392, -104.9903),
        'phoenix': (33.4484, -112.0740),
        'seattle': (47.6062, -122.3321),
        'boston': (42.3601, -71.0589),
        'memphis': (35.1495, -90.0490),
        'kansas city': (39.0997, -94.5786),
        'st. louis': (38.6270, -90.1994),
        'indianapolis': (39.7684, -86.1581),
        'columbus': (39.9612, -82.9988),
        'charlotte': (35.2271, -80.8431),
        'detroit': (42.3314, -83.0458),
    }
    loc_lower = location.lower().strip()
    for city, (lat, lon) in known.items():
        if city in loc_lower:
            return {'lat': lat, 'lon': lon, 'label': location}
    # Default to center of US
    return {'lat': 39.5, 'lon': -98.35, 'label': location}


def _fallback_route(origin: dict, pickup: dict, dropoff: dict) -> dict:
    """Estimate route when ORS is unavailable."""
    d1 = _haversine_miles(origin['lat'], origin['lon'], pickup['lat'], pickup['lon'])
    d2 = _haversine_miles(pickup['lat'], pickup['lon'], dropoff['lat'], dropoff['lon'])
    # Road factor: ~1.3x straight-line
    d1 *= 1.3
    d2 *= 1.3
    h1 = d1 / AVERAGE_SPEED_MPH
    h2 = d2 / AVERAGE_SPEED_MPH
    total = d1 + d2

    # Rough waypoints: just the 3 main points
    waypoints = [
        [origin['lat'], origin['lon']],
        [pickup['lat'], pickup['lon']],
        [dropoff['lat'], dropoff['lon']],
    ]

    return {
        'total_distance_miles': round(total, 2),
        'total_duration_hours': round(h1 + h2, 4),
        'segments': [
            {
                'distance_miles': round(d1, 2),
                'duration_hours': round(h1, 4),
                'from_location': origin.get('label', 'Origin'),
                'to_location': pickup.get('label', 'Pickup'),
            },
            {
                'distance_miles': round(d2, 2),
                'duration_hours': round(h2, 4),
                'from_location': pickup.get('label', 'Pickup'),
                'to_location': dropoff.get('label', 'Dropoff'),
            },
        ],
        'waypoints': waypoints,
        'origin': origin,
        'pickup': pickup,
        'dropoff': dropoff,
    }
