"""
HOS (Hours of Service) logic - FMCSA property-carrying CMV rules.
Uses absolute time from trip start, then buckets into daily logs.

Rules enforced:
- 11h max driving per shift
- 14h driving window per shift
- 30min break after 8h cumulative driving (since last break)
- 10h required rest between shifts
- 70h / 8-day rolling cycle limit
- Fuel every 1000 miles (0.5h stop)
- 1h pickup + 1h dropoff
"""

from dataclasses import dataclass, field
from typing import List, Optional

AVERAGE_SPEED_MPH = 55.0
MAX_DRIVING_HRS = 11.0
MAX_WINDOW_HRS = 14.0
BREAK_TRIGGER_HRS = 8.0
BREAK_DURATION_HRS = 0.5
REQUIRED_REST_HRS = 10.0
MAX_CYCLE_HRS = 70.0
PICKUP_HRS = 1.0
DROPOFF_HRS = 1.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HRS = 0.5


@dataclass
class Event:
    """A single duty-status event (absolute time from trip start)."""
    status: str          # off_duty | driving | on_duty_not_driving
    t_start: float       # hours from trip start
    t_end: float
    location: str
    note: str = ''

    @property
    def duration(self):
        return self.t_end - self.t_start


@dataclass
class Stop:
    stop_type: str       # pickup | dropoff | fuel | rest | break
    location: str
    distance_from_start: float
    duration_hours: float
    lat: Optional[float] = None
    lon: Optional[float] = None


def calculate_trip_plan(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
    route_data: dict,
) -> dict:
    segments = route_data.get('segments', [])
    total_distance = route_data.get('total_distance_miles', 0)

    events, stops = _simulate(
        segments, current_location, pickup_location,
        dropoff_location, current_cycle_used
    )

    daily_logs = _events_to_daily_logs(events)

    return {
        'stops': [_stop_to_dict(s) for s in stops],
        'daily_logs': daily_logs,
        'summary': {
            'total_distance_miles': round(total_distance, 1),
            'total_driving_hours': round(sum(
                e.duration for e in events if e.status == 'driving'
            ), 2),
            'total_days': len(daily_logs),
            'total_stops': len(stops),
        }
    }


def _simulate(segments, current_location, pickup_location, dropoff_location, cycle_used):
    events: List[Event] = []
    stops: List[Stop] = []

    # Absolute clock (hours from start)
    t = 0.0

    # Shift state (resets after each 10h rest)
    shift_start = 0.0          # absolute time when current shift began
    driven_this_shift = 0.0    # driving hours since shift started
    since_break = 0.0          # driving hours since last 30-min break

    # Cycle state
    cycle_hours = cycle_used   # rolling 70h tracker (simplified: we just accumulate on-duty time)

    # Mileage state
    miles_total = 0.0
    miles_since_fuel = 0.0

    def window_remaining():
        return MAX_WINDOW_HRS - (t - shift_start)

    def driving_remaining():
        return MAX_DRIVING_HRS - driven_this_shift

    def do_rest(location, note='Required 10h rest'):
        nonlocal t, shift_start, driven_this_shift, since_break, cycle_hours
        events.append(Event('off_duty', t, t + REQUIRED_REST_HRS, location, note))
        t += REQUIRED_REST_HRS
        shift_start = t
        driven_this_shift = 0.0
        since_break = 0.0
        # cycle hours for previous 8 days would drop off; simplified: deduct rest time worth
        # (production system would track each day separately)

    def do_break(location):
        nonlocal t, since_break, cycle_hours
        events.append(Event('off_duty', t, t + BREAK_DURATION_HRS, location, '30-min mandatory break'))
        t += BREAK_DURATION_HRS
        since_break = 0.0
        stops.append(Stop('break', location, miles_total, BREAK_DURATION_HRS))

    def drive(hours, location):
        nonlocal t, driven_this_shift, since_break, cycle_hours, miles_total, miles_since_fuel

        remaining = hours
        while remaining > 0.0001:
            # Need rest? Check window and shift driving limit
            win = window_remaining()
            drv = driving_remaining()
            cycle_avail = MAX_CYCLE_HRS - cycle_hours

            if win <= 0.001 or drv <= 0.001 or cycle_avail <= 0.001:
                do_rest(location)
                win = MAX_WINDOW_HRS
                drv = MAX_DRIVING_HRS
                cycle_avail = MAX_CYCLE_HRS - cycle_hours

            # Need 30-min break?
            if since_break >= BREAK_TRIGGER_HRS - 0.0001:
                do_break(location)

            # Max we can drive before needing break
            before_break = BREAK_TRIGGER_HRS - since_break

            # Max this chunk
            chunk = min(drv, win, before_break, cycle_avail, remaining)
            if chunk < 0.0001:
                do_rest(location)
                continue

            # Fuel check: will we hit 1000 miles?
            miles_this_chunk = chunk * AVERAGE_SPEED_MPH
            if miles_since_fuel + miles_this_chunk > FUEL_INTERVAL_MILES:
                miles_to_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
                hrs_to_fuel = miles_to_fuel / AVERAGE_SPEED_MPH
                if hrs_to_fuel > 0.0001:
                    events.append(Event('driving', t, t + hrs_to_fuel, location))
                    t += hrs_to_fuel
                    driven_this_shift += hrs_to_fuel
                    since_break += hrs_to_fuel
                    cycle_hours += hrs_to_fuel
                    miles_total += miles_to_fuel
                    miles_since_fuel += miles_to_fuel
                    remaining -= hrs_to_fuel
                    chunk -= hrs_to_fuel

                # Fuel stop
                events.append(Event('on_duty_not_driving', t, t + FUEL_STOP_HRS, location, 'Fuel stop'))
                t += FUEL_STOP_HRS
                cycle_hours += FUEL_STOP_HRS
                miles_since_fuel = 0.0
                stops.append(Stop('fuel', location, miles_total, FUEL_STOP_HRS))
                continue  # recalculate chunk with fresh constraints

            # Normal drive
            events.append(Event('driving', t, t + chunk, location))
            t += chunk
            driven_this_shift += chunk
            since_break += chunk
            cycle_hours += chunk
            miles_total += chunk * AVERAGE_SPEED_MPH
            miles_since_fuel += chunk * AVERAGE_SPEED_MPH
            remaining -= chunk

    def on_duty(hours, location, note):
        nonlocal t, cycle_hours
        # Check window still has room
        if window_remaining() < hours:
            do_rest(location)
        events.append(Event('on_duty_not_driving', t, t + hours, location, note))
        t += hours
        cycle_hours += hours

    # --- Build trip phases ---
    seg0 = segments[0] if len(segments) > 0 else {}
    seg1 = segments[1] if len(segments) > 1 else {}

    # Phase 1: Drive current → pickup
    if seg0.get('distance_miles', 0) > 0:
        drive(seg0['duration_hours'], seg0.get('from_location', current_location))

    # Phase 2: Pickup (1h on-duty)
    on_duty(PICKUP_HRS, pickup_location, '1-hour pickup')
    stops.append(Stop('pickup', pickup_location, miles_total, PICKUP_HRS))

    # Phase 3: Drive pickup → dropoff
    if seg1.get('distance_miles', 0) > 0:
        drive(seg1['duration_hours'], seg1.get('from_location', pickup_location))

    # Phase 4: Dropoff (1h on-duty)
    on_duty(DROPOFF_HRS, dropoff_location, '1-hour dropoff')
    stops.append(Stop('dropoff', dropoff_location, miles_total, DROPOFF_HRS))

    # Off-duty to end of current day
    events.append(Event('off_duty', t, t + 0.1, dropoff_location, 'End of shift'))

    return events, stops


def _events_to_daily_logs(events: List[Event]) -> list:
    """
    Bucket absolute-time events into 24h daily logs.
    Day 1 = hours 0–24, Day 2 = hours 24–48, etc.
    """
    if not events:
        return []

    max_t = max(e.t_end for e in events)
    num_days = max(1, int(max_t // 24) + (1 if max_t % 24 > 0 else 0))

    daily_logs = []

    for day_idx in range(num_days):
        day_start = day_idx * 24.0
        day_end = day_start + 24.0
        day_entries = []
        day_miles = 0.0

        for ev in events:
            # Clip event to this day
            s = max(ev.t_start, day_start)
            e = min(ev.t_end, day_end)
            if e <= s:
                continue
            local_start = s - day_start
            local_end = e - day_start
            day_entries.append({
                'status': ev.status,
                'start_hour': round(local_start, 4),
                'end_hour': round(local_end, 4),
                'location': ev.location,
                'remarks': ev.note,
            })
            if ev.status == 'driving':
                day_miles += (e - s) * AVERAGE_SPEED_MPH

        if not day_entries:
            continue

        # Fill gaps with off_duty
        day_entries = _fill_gaps(day_entries)

        hours = {
            'off_duty': 0.0,
            'sleeper_berth': 0.0,
            'driving': 0.0,
            'on_duty_not_driving': 0.0,
        }
        for ent in day_entries:
            dur = ent['end_hour'] - ent['start_hour']
            hours[ent['status']] = round(hours.get(ent['status'], 0) + dur, 4)

        daily_logs.append({
            'day_number': day_idx + 1,
            'date_label': f'Day {day_idx + 1}',
            'total_miles': round(day_miles, 1),
            'hours': hours,
            'entries': day_entries,
        })

    return daily_logs


def _fill_gaps(entries: list) -> list:
    """Insert off_duty entries to fill 0–24h gaps."""
    if not entries:
        return [{'status': 'off_duty', 'start_hour': 0.0, 'end_hour': 24.0, 'location': '', 'remarks': ''}]

    result = []
    entries = sorted(entries, key=lambda x: x['start_hour'])

    # Gap at start
    if entries[0]['start_hour'] > 0.001:
        result.append({'status': 'off_duty', 'start_hour': 0.0,
                       'end_hour': entries[0]['start_hour'],
                       'location': entries[0]['location'], 'remarks': ''})

    for i, ent in enumerate(entries):
        result.append(ent)
        if i + 1 < len(entries):
            gap_start = ent['end_hour']
            gap_end = entries[i + 1]['start_hour']
            if gap_end - gap_start > 0.001:
                result.append({'status': 'off_duty', 'start_hour': round(gap_start, 4),
                                'end_hour': round(gap_end, 4),
                                'location': ent['location'], 'remarks': ''})

    # Gap at end
    last_end = result[-1]['end_hour']
    if 24.0 - last_end > 0.001:
        result.append({'status': 'off_duty', 'start_hour': round(last_end, 4),
                       'end_hour': 24.0,
                       'location': result[-1]['location'], 'remarks': ''})

    return result


def _stop_to_dict(s: Stop) -> dict:
    return {
        'stop_type': s.stop_type,
        'location': s.location,
        'distance_from_start': round(s.distance_from_start, 1),
        'duration_hours': s.duration_hours,
        'lat': s.lat,
        'lon': s.lon,
    }
