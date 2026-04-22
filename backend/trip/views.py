from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .routing_service import geocode, get_route
from .hos_service import calculate_trip_plan


class TripPlanView(APIView):
    def post(self, request):
        data = request.data

        current_location = data.get('current_location', '').strip()
        pickup_location = data.get('pickup_location', '').strip()
        dropoff_location = data.get('dropoff_location', '').strip()
        current_cycle_used = float(data.get('current_cycle_used_hours', 0))

        if not all([current_location, pickup_location, dropoff_location]):
            return Response(
                {'error': 'current_location, pickup_location, and dropoff_location are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not (0 <= current_cycle_used <= 70):
            return Response(
                {'error': 'current_cycle_used_hours must be between 0 and 70.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Geocode all locations
        origin = geocode(current_location)
        origin['label'] = current_location
        pickup = geocode(pickup_location)
        pickup['label'] = pickup_location
        dropoff = geocode(dropoff_location)
        dropoff['label'] = dropoff_location

        # Get route from ORS
        route_data = get_route(origin, pickup, dropoff)

        # Run HOS calculation
        result = calculate_trip_plan(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=current_cycle_used,
            route_data=route_data,
        )

        return Response({
            'route': {
                'waypoints': route_data['waypoints'],
                'total_distance_miles': route_data['total_distance_miles'],
                'total_duration_hours': route_data['total_duration_hours'],
                'origin': route_data['origin'],
                'pickup': route_data['pickup'],
                'dropoff': route_data['dropoff'],
                'segments': route_data['segments'],
            },
            'stops': result['stops'],
            'daily_logs': result['daily_logs'],
            'summary': result['summary'],
        })
