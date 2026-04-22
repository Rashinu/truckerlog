/**
 * ELD Daily Log Sheet — visually matches the official FMCSA Driver's Daily Log format.
 * 24-hour grid with 4 duty status rows (Off Duty, Sleeper Berth, Driving, On Duty Not Driving).
 * Each hour = 1 column, each 15-min = 1 cell (96 cells total per row).
 */

const STATUS_ROWS = [
  { key: 'off_duty',           label: 'Off Duty',              row: 0, color: '#64748b' },
  { key: 'sleeper_berth',      label: 'Sleeper Berth',         row: 1, color: '#7c3aed' },
  { key: 'driving',            label: 'Driving',               row: 2, color: '#2563eb' },
  { key: 'on_duty_not_driving',label: 'On Duty (Not Driving)', row: 3, color: '#16a34a' },
]

const GRID_WIDTH = 960     // px, total width of 24-hour grid
const ROW_HEIGHT = 32      // px per status row
const HOUR_WIDTH = GRID_WIDTH / 24  // 40px per hour

function hourToX(hour) {
  return (hour / 24) * GRID_WIDTH
}

export default function ELDLogSheet({ log, route, dayIndex }) {
  if (!log) return null

  const today = new Date()
  const logDate = new Date(today)
  logDate.setDate(today.getDate() + dayIndex)
  const dateStr = logDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  return (
    <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none">
      {/* Header */}
      <div className="bg-gray-50 border-b-2 border-gray-300 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">U.S. Department of Transportation</div>
            <h2 className="text-xl font-bold text-gray-900">Driver's Daily Log</h2>
            <div className="text-xs text-gray-500">(24 hours)</div>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <div className="font-semibold text-gray-700">Original — File at home terminal</div>
            <div>Duplicate — Driver retains in his/her possession for 8 days</div>
          </div>
        </div>

        {/* Date + From/To */}
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Month / Day / Year</div>
                <div className="border-b border-gray-400 pb-0.5 font-medium text-sm">{dateStr}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">From</div>
              <div className="border-b border-gray-400 pb-0.5 text-sm font-medium truncate">
                {route?.origin?.label || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">To</div>
              <div className="border-b border-gray-400 pb-0.5 text-sm font-medium truncate">
                {route?.dropoff?.label || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Mileage + carrier info */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Total Miles Driving Today</div>
            <div className="border-b border-gray-400 pb-0.5 font-semibold text-sm">{Math.round(log.total_miles)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Name of Carrier</div>
            <div className="border-b border-gray-400 pb-0.5 text-sm">TruckerLog Inc.</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Truck/Tractor Numbers</div>
            <div className="border-b border-gray-400 pb-0.5 text-sm">CMV-001</div>
          </div>
        </div>
      </div>

      {/* Graph Grid */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <div style={{ minWidth: GRID_WIDTH + 180 }}>
            {/* Hour labels */}
            <HourLabels />

            {/* Status rows */}
            {STATUS_ROWS.map(row => (
              <GridRow
                key={row.key}
                statusKey={row.key}
                label={row.label}
                entries={log.entries}
                color={row.color}
              />
            ))}

            {/* Remarks row */}
            <RemarksRow entries={log.entries} />

            {/* Hour labels (bottom) */}
            <HourLabels bottom />
          </div>
        </div>

        {/* Hours summary */}
        <HoursSummary hours={log.hours} />

        {/* Remarks text */}
        <RemarksText entries={log.entries} />

        {/* Recap / signature */}
        <Footer log={log} />
      </div>
    </div>
  )
}

function HourLabels({ bottom = false }) {
  const hours = [
    'Mid-\nnight', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
    'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Mid-\nnight'
  ]
  return (
    <div className="flex" style={{ marginLeft: 140 }}>
      {hours.map((h, i) => (
        <div
          key={i}
          className="text-center text-gray-500 border-l border-gray-300"
          style={{ width: i === 24 ? HOUR_WIDTH / 2 : HOUR_WIDTH, flexShrink: 0, fontSize: 9, lineHeight: '1.2' }}
        >
          {h.split('\n').map((line, j) => <div key={j}>{line}</div>)}
        </div>
      ))}
    </div>
  )
}

function GridRow({ statusKey, label, entries, color }) {
  const relevant = entries.filter(e => e.status === statusKey)
  const totalHours = relevant.reduce((sum, e) => sum + (e.end_hour - e.start_hour), 0)

  return (
    <div className="flex items-stretch border-t border-gray-300">
      {/* Row label */}
      <div
        className="flex items-center justify-end pr-2 text-right border-r-2 border-gray-400 bg-gray-50 flex-shrink-0"
        style={{ width: 140, minHeight: ROW_HEIGHT, fontSize: 10, fontWeight: 600 }}
      >
        {label}
      </div>

      {/* Grid SVG */}
      <div className="relative flex-shrink-0" style={{ width: GRID_WIDTH, height: ROW_HEIGHT }}>
        <svg width={GRID_WIDTH} height={ROW_HEIGHT} style={{ display: 'block' }}>
          {/* Grid lines */}
          {Array.from({ length: 25 }, (_, i) => (
            <line
              key={i}
              x1={hourToX(i)} y1={0}
              x2={hourToX(i)} y2={ROW_HEIGHT}
              stroke={i % 6 === 0 ? '#9ca3af' : i % 1 === 0 ? '#d1d5db' : '#e5e7eb'}
              strokeWidth={i % 6 === 0 ? 1.5 : 0.5}
            />
          ))}
          {/* Quarter-hour tick marks along bottom */}
          {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
            const x = (i / (24 * 4)) * GRID_WIDTH
            const isHalf = i % 2 === 0
            const tickLen = isHalf ? 6 : 4
            return (
              <line
                key={`tick-${i}`}
                x1={x} y1={ROW_HEIGHT}
                x2={x} y2={ROW_HEIGHT - tickLen}
                stroke="#d1d5db"
                strokeWidth={0.5}
              />
            )
          })}

          {/* Duty status bars */}
          {relevant.map((entry, i) => {
            const x = hourToX(entry.start_hour)
            const w = hourToX(entry.end_hour) - x
            if (w <= 0) return null
            return (
              <rect
                key={i}
                x={x}
                y={4}
                width={w}
                height={ROW_HEIGHT - 8}
                fill={color}
                opacity={0.85}
                rx={2}
              />
            )
          })}

          {/* Horizontal line through middle (ELD style) */}
          {relevant.map((entry, i) => {
            const x1 = hourToX(entry.start_hour)
            const x2 = hourToX(entry.end_hour)
            if (x2 <= x1) return null
            return (
              <line
                key={`line-${i}`}
                x1={x1} y1={ROW_HEIGHT / 2}
                x2={x2} y2={ROW_HEIGHT / 2}
                stroke="white"
                strokeWidth={1.5}
                opacity={0.7}
              />
            )
          })}
        </svg>
      </div>

      {/* Total hours */}
      <div
        className="flex items-center justify-center border-l-2 border-gray-400 bg-gray-50 font-semibold text-gray-700 flex-shrink-0"
        style={{ width: 50, fontSize: 11 }}
      >
        {totalHours.toFixed(2)}
      </div>
    </div>
  )
}

function RemarksRow({ entries }) {
  // Show location labels at status change points
  const changes = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.location && e.location !== (entries[i - 1]?.location || '')) {
      changes.push({ hour: e.start_hour, location: e.location })
    }
  }

  return (
    <div className="flex border-t border-gray-400">
      <div
        className="flex items-center justify-end pr-2 text-right border-r-2 border-gray-400 bg-gray-50 flex-shrink-0 text-xs font-semibold"
        style={{ width: 140, minHeight: 28 }}
      >
        REMARKS
      </div>
      <div className="relative flex-1" style={{ height: 28 }}>
        <svg width={GRID_WIDTH} height={28}>
          {/* Vertical marks at status changes */}
          {changes.map((c, i) => (
            <g key={i}>
              <line
                x1={hourToX(c.hour)} y1={0}
                x2={hourToX(c.hour)} y2={10}
                stroke="#374151"
                strokeWidth={1}
              />
              <text
                x={hourToX(c.hour) + 2}
                y={22}
                fontSize={7}
                fill="#374151"
                style={{ fontStyle: 'italic' }}
              >
                {c.location.split(',')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function HoursSummary({ hours }) {
  const rows = [
    { key: 'off_duty', label: '1. Off Duty', color: '#64748b' },
    { key: 'sleeper_berth', label: '2. Sleeper Berth', color: '#7c3aed' },
    { key: 'driving', label: '3. Driving', color: '#2563eb' },
    { key: 'on_duty_not_driving', label: '4. On Duty (Not Driving)', color: '#16a34a' },
  ]
  const total = Object.values(hours).reduce((a, b) => a + b, 0)

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {rows.map(r => (
        <div key={r.key} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: r.color }} />
          <span className="text-xs text-gray-600">{r.label}</span>
          <span className="text-sm font-bold text-gray-900">{hours[r.key]?.toFixed(2) || '0.00'}h</span>
        </div>
      ))}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
        <span className="text-xs text-gray-300">TOTAL</span>
        <span className="text-sm font-bold text-white">{total.toFixed(2)}h</span>
      </div>
    </div>
  )
}

function RemarksText({ entries }) {
  const remarks = entries
    .filter(e => e.remarks || e.location)
    .map(e => {
      const time = formatHour(e.start_hour)
      const loc = e.location ? `— ${e.location}` : ''
      const note = e.remarks ? `(${e.remarks})` : ''
      return `${time}: ${statusLabel(e.status)} ${note} ${loc}`.trim()
    })

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Remarks / Location Changes:</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {remarks.map((r, i) => (
          <div key={i} className="text-xs text-gray-600 font-mono">{r}</div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 italic">
        Enter name of place you reported and where released from work and when and where each change of duty occurred.
        Use time standard of home terminal.
      </p>
    </div>
  )
}

function Footer({ log }) {
  return (
    <div className="mt-4 border-t-2 border-gray-300 pt-3 grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-gray-500 mb-1">Driver Signature / Certification</div>
        <div className="border-b border-gray-400 h-6 w-full" />
        <div className="text-xs text-gray-400 mt-1">I certify that these entries are true and correct.</div>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <div className="font-semibold text-gray-700">Recap — Complete at end of day</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div>On-duty hours today:</div>
            <div className="font-semibold text-gray-800">
              {((log.hours.driving || 0) + (log.hours.on_duty_not_driving || 0)).toFixed(2)}h
            </div>
          </div>
          <div>
            <div>Total lines 3 & 4:</div>
            <div className="font-semibold text-gray-800">
              {((log.hours.driving || 0) + (log.hours.on_duty_not_driving || 0)).toFixed(2)}h
            </div>
          </div>
        </div>
        <div className="text-gray-400 mt-1">70-hour / 8-day cycle</div>
      </div>
    </div>
  )
}

function formatHour(h) {
  const total_min = Math.round(h * 60)
  const hours = Math.floor(total_min / 60) % 24
  const mins = total_min % 60
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayH = hours % 12 || 12
  return `${displayH}:${String(mins).padStart(2, '0')} ${ampm}`
}

function statusLabel(status) {
  return {
    off_duty: 'Off Duty',
    sleeper_berth: 'Sleeper Berth',
    driving: 'Driving',
    on_duty_not_driving: 'On Duty (Not Driving)',
  }[status] || status
}
