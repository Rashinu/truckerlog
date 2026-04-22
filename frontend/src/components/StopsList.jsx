const STOP_CONFIG = {
  pickup:  { icon: '📦', color: 'blue',   label: 'Pickup Stop',   bg: 'bg-blue-950/50 border-blue-800' },
  dropoff: { icon: '🏁', color: 'green',  label: 'Dropoff Stop',  bg: 'bg-green-950/50 border-green-800' },
  fuel:    { icon: '⛽', color: 'amber',  label: 'Fuel Stop',     bg: 'bg-amber-950/50 border-amber-800' },
  rest:    { icon: '🛏️', color: 'purple', label: 'Rest Period',   bg: 'bg-purple-950/50 border-purple-800' },
  break:   { icon: '☕', color: 'red',    label: '30-Min Break',  bg: 'bg-red-950/50 border-red-800' },
}

export default function StopsList({ stops }) {
  if (!stops || stops.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
        No stops calculated.
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="font-semibold text-white mb-4">Planned Stops ({stops.length})</h3>
      <div className="space-y-3">
        {stops.map((stop, i) => {
          const cfg = STOP_CONFIG[stop.stop_type] || STOP_CONFIG.break
          return (
            <div key={i} className={`flex items-start gap-4 p-4 border rounded-xl ${cfg.bg}`}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{cfg.label}</span>
                  <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                    Stop #{i + 1}
                  </span>
                </div>
                <div className="text-sm text-slate-300 mt-0.5 truncate">{stop.location}</div>
                <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                  <span>⏱ {formatDuration(stop.duration_hours)}</span>
                  <span>📍 Mile {Math.round(stop.distance_from_start)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 p-4 bg-slate-800/50 rounded-xl text-xs text-slate-400 space-y-1">
        <p className="font-medium text-slate-300 mb-2">HOS Rules Applied:</p>
        <p>✅ Max 11 hours driving per shift</p>
        <p>✅ 14-hour driving window per shift</p>
        <p>✅ 30-minute break after 8 cumulative driving hours</p>
        <p>✅ 10-hour mandatory rest between shifts</p>
        <p>✅ Fuel stop every 1,000 miles (0.5h)</p>
        <p>✅ 1-hour pickup + 1-hour dropoff (on-duty time)</p>
      </div>
    </div>
  )
}

function formatDuration(hours) {
  if (hours >= 1) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.round(hours * 60)}min`
}
