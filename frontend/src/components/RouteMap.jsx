import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons for Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function makeIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:white;
      width:32px;height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:bold;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "><span style="transform:rotate(45deg)">${label}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  })
}

const stopIcons = {
  pickup:  makeIcon('#2563eb', '📦'),
  dropoff: makeIcon('#16a34a', '🏁'),
  fuel:    makeIcon('#d97706', '⛽'),
  rest:    makeIcon('#7c3aed', '🛏'),
  break:   makeIcon('#dc2626', '☕'),
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions && positions.length > 1) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [positions, map])
  return null
}

export default function RouteMap({ route, stops }) {
  if (!route) return null

  const waypoints = route.waypoints || []
  const positions = waypoints.map(([lat, lon]) => [lat, lon])

  const origin = route.origin
  const pickup = route.pickup
  const dropoff = route.dropoff

  const mainPoints = [
    { coords: [origin.lat, origin.lon], label: '🚛 Current Location', sublabel: origin.label, color: '#64748b' },
    { coords: [pickup.lat, pickup.lon], label: '📦 Pickup', sublabel: pickup.label, color: '#2563eb' },
    { coords: [dropoff.lat, dropoff.lon], label: '🏁 Dropoff', sublabel: dropoff.label, color: '#16a34a' },
  ]

  const center = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : [39.5, -98.35]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Route Map</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {route.total_distance_miles} miles · {route.segments?.map(s => s.from_location).join(' → ')} → {route.dropoff?.label}
          </p>
        </div>
        <div className="flex gap-3 text-xs text-slate-400">
          {[
            { color: '#2563eb', label: 'Pickup' },
            { color: '#16a34a', label: 'Dropoff' },
            { color: '#d97706', label: 'Fuel' },
            { color: '#dc2626', label: 'Break/Rest' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span style={{ background: l.color }} className="w-2.5 h-2.5 rounded-full inline-block" />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ height: '480px' }}>
        <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {positions.length > 1 && (
            <Polyline
              positions={positions}
              color="#3b82f6"
              weight={4}
              opacity={0.85}
              dashArray={null}
            />
          )}

          {/* Main waypoints */}
          {mainPoints.map((pt, i) => (
            <Marker
              key={i}
              position={pt.coords}
              icon={makeIcon(pt.color, i === 0 ? 'S' : i === 1 ? 'P' : 'D')}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong>{pt.label}</strong>
                  <br />
                  <span style={{ color: '#64748b', fontSize: 12 }}>{pt.sublabel}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Stop markers */}
          {stops
            .filter(s => s.lat && s.lon && !['pickup', 'dropoff'].includes(s.stop_type))
            .map((stop, i) => (
              <Marker
                key={`stop-${i}`}
                position={[stop.lat, stop.lon]}
                icon={stopIcons[stop.stop_type] || stopIcons.break}
              >
                <Popup>
                  <strong className="capitalize">{stop.stop_type} Stop</strong>
                  <br />
                  {stop.location}
                  <br />
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    {stop.duration_hours}h · {stop.distance_from_start} mi from start
                  </span>
                </Popup>
              </Marker>
            ))}

          <FitBounds positions={positions.length > 1 ? positions : mainPoints.map(p => p.coords)} />
        </MapContainer>
      </div>
    </div>
  )
}
