"""
Geocoding: Nominatim (OpenStreetMap) — free, no key
Routing:   OSRM public API — free, no key
Fallback:  Haversine estimation when APIs unavailable
"""

import requests
import math
import time

AVERAGE_SPEED_MPH = 55.0
KM_TO_MILES = 0.621371
METERS_TO_MILES = 0.000621371

NOMINATIM_HEADERS = {
    'User-Agent': 'TruckerLog-ELD-Planner/1.0 (assessment project)',
}


def geocode(location: str) -> dict:
    """Return {lat, lon, label} for a location string via Nominatim."""
    url = 'https://nominatim.openstreetmap.org/search'
    params = {
        'q': location,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'us',
    }
    try:
        time.sleep(0.3)  # Nominatim rate limit: 1 req/sec
        r = requests.get(url, params=params, headers=NOMINATIM_HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data:
            item = data[0]
            return {
                'lat': float(item['lat']),
                'lon': float(item['lon']),
                'label': item.get('display_name', location).split(',')[0] + ', ' + location.split(',')[-1].strip(),
            }
    except Exception as e:
        print(f'Nominatim geocode error for "{location}": {e}')
    return _fallback_geocode(location)


def get_route(origin: dict, pickup: dict, dropoff: dict) -> dict:
    """
    Get driving route via OSRM public API.
    Returns structured route data with waypoints + segment info.
    """
    coords = f"{origin['lon']},{origin['lat']};{pickup['lon']},{pickup['lat']};{dropoff['lon']},{dropoff['lat']}"
    url = f'http://router.project-osrm.org/route/v1/driving/{coords}'
    params = {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'false',
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get('code') == 'Ok' and data.get('routes'):
            return _parse_osrm_response(data, origin, pickup, dropoff)
    except Exception as e:
        print(f'OSRM routing error: {e}')

    return _fallback_route(origin, pickup, dropoff)


def _parse_osrm_response(data: dict, origin: dict, pickup: dict, dropoff: dict) -> dict:
    route = data['routes'][0]

    # Total
    total_meters = route['distance']
    total_seconds = route['duration']
    total_miles = total_meters * METERS_TO_MILES
    total_hours = total_seconds / 3600

    # OSRM returns one route for all waypoints — split at legs
    legs = route.get('legs', [])
    segments = []
    locations = [origin, pickup, dropoff]
    for i, leg in enumerate(legs[:2]):
        dist_miles = leg['distance'] * METERS_TO_MILES
        dur_hours = leg['duration'] / 3600
        segments.append({
            'distance_miles': round(dist_miles, 2),
            'duration_hours': round(dur_hours, 4),
            'from_location': locations[i].get('label', ''),
            'to_location': locations[i + 1].get('label', ''),
        })

    # GeoJSON geometry: list of [lon, lat]
    coords_raw = route['geometry']['coordinates']
    waypoints = [[lat, lon] for lon, lat in coords_raw]

    return {
        'total_distance_miles': round(total_miles, 2),
        'total_duration_hours': round(total_hours, 4),
        'segments': segments,
        'waypoints': waypoints,
        'origin': origin,
        'pickup': pickup,
        'dropoff': dropoff,
    }


def _haversine_miles(lat1, lon1, lat2, lon2) -> float:
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fallback_geocode(location: str) -> dict:
    """Coordinate lookup for common US cities."""
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
        'san antonio': (29.4241, -98.4936),
        'san diego': (32.7157, -117.1611),
        'san jose': (37.3382, -121.8863),
        'austin': (30.2672, -97.7431),
        'jacksonville': (30.3322, -81.6557),
        'fort worth': (32.7555, -97.3308),
        'el paso': (31.7619, -106.4850),
        'portland': (45.5051, -122.6750),
        'las vegas': (36.1699, -115.1398),
        'louisville': (38.2527, -85.7585),
        'baltimore': (39.2904, -76.6122),
        'milwaukee': (43.0389, -87.9065),
        'albuquerque': (35.0844, -106.6504),
        'tucson': (32.2226, -110.9747),
        'fresno': (36.7378, -119.7871),
        'sacramento': (38.5816, -121.4944),
        'mesa': (33.4152, -111.8315),
        'richmond': (37.5407, -77.4360),
        'omaha': (41.2565, -95.9345),
        'raleigh': (35.7796, -78.6382),
        'cleveland': (41.4993, -81.6944),
        'minneapolis': (44.9778, -93.2650),
        'baton rouge': (30.4515, -91.1871),
        'new orleans': (29.9511, -90.0715),
        'tampa': (27.9506, -82.4572),
        'orlando': (28.5383, -81.3792),
        'cincinnati': (39.1031, -84.5120),
        'pittsburgh': (40.4406, -79.9959),
    }
    loc_lower = location.lower().strip()
    for city, (lat, lon) in known.items():
        if city in loc_lower:
            return {'lat': lat, 'lon': lon, 'label': location}
    return {'lat': 39.5, 'lon': -98.35, 'label': location}


def _fallback_route(origin: dict, pickup: dict, dropoff: dict) -> dict:
    """Estimate route when OSRM is unavailable — haversine + 1.3x road factor."""
    d1 = _haversine_miles(origin['lat'], origin['lon'], pickup['lat'], pickup['lon']) * 1.3
    d2 = _haversine_miles(pickup['lat'], pickup['lon'], dropoff['lat'], dropoff['lon']) * 1.3
    h1 = d1 / AVERAGE_SPEED_MPH
    h2 = d2 / AVERAGE_SPEED_MPH

    # Interpolate intermediate waypoints for map display
    def interp(p1, p2, steps=8):
        return [
            [p1['lat'] + (p2['lat'] - p1['lat']) * i / steps,
             p1['lon'] + (p2['lon'] - p1['lon']) * i / steps]
            for i in range(steps + 1)
        ]

    waypoints = interp(origin, pickup) + interp(pickup, dropoff)[1:]

    return {
        'total_distance_miles': round(d1 + d2, 2),
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
