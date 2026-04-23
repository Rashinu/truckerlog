/**
 * ELD Daily Log Sheet — matches FMCSA Driver's Daily Log format exactly.
 * 24-hour horizontal grid, 4 duty-status rows, SVG rendering.
 */

const STATUS_ROWS = [
  { key: 'off_duty',            label: '1. Off Duty',              color: '#6b7280' },
  { key: 'sleeper_berth',       label: '2. Sleeper Berth',         color: '#7c3aed' },
  { key: 'driving',             label: '3. Driving',               color: '#1d4ed8' },
  { key: 'on_duty_not_driving', label: '4. On Duty (Not Driving)', color: '#15803d' },
]

const GRID_W = 960
const ROW_H = 36
const LABEL_W = 150
const TOTAL_W = 56

function px(hour) {
  return (hour / 24) * GRID_W
}

export default function ELDLogSheet({ log, route, dayIndex }) {
  if (!log) return null

  const today = new Date()
  const logDate = new Date(today)
  logDate.setDate(today.getDate() + dayIndex)
  const month = String(logDate.getMonth() + 1).padStart(2, '0')
  const day = String(logDate.getDate()).padStart(2, '0')
  const year = logDate.getFullYear()

  const totalOnDuty = ((log.hours.driving || 0) + (log.hours.on_duty_not_driving || 0)).toFixed(2)

  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── TOP HEADER ───────────────────────────────────────────── */}
      <div className="border-b-2 border-gray-400 bg-gray-50 px-5 py-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">U.S. Department of Transportation</div>
            <div className="text-2xl font-bold text-gray-900 leading-tight">Driver's Daily Log</div>
            <div className="text-xs text-gray-500">(24 hours)</div>
          </div>
          <div className="text-right text-xs text-gray-500 leading-relaxed">
            <div className="font-medium text-gray-700">Original — File at home terminal</div>
            <div>Duplicate — Driver retains in possession for 8 days</div>
          </div>
        </div>

        {/* Date + From/To row */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">Month / Day / Year</span>
            <div className="border-b-2 border-gray-400 pb-0.5 font-semibold text-lg">
              {month} / {day} / {year}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">From</span>
            <div className="border-b border-gray-400 pb-0.5 truncate">{route?.origin?.label || '—'}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">To</span>
            <div className="border-b border-gray-400 pb-0.5 truncate">{route?.dropoff?.label || '—'}</div>
          </div>
        </div>

        {/* Carrier / mileage row */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">Total Miles Driving Today</span>
            <div className="border-b border-gray-400 pb-0.5 font-bold text-lg">{Math.round(log.total_miles)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">Name of Carrier or Carriers</span>
            <div className="border-b border-gray-400 pb-0.5">TruckerLog Inc.</div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">Truck / Tractor & Trailer Numbers</span>
            <div className="border-b border-gray-400 pb-0.5">CMV-001 / TR-2024</div>
          </div>
        </div>
      </div>

      {/* ── GRAPH GRID ───────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2 overflow-x-auto">
        <div style={{ minWidth: LABEL_W + GRID_W + TOTAL_W + 8 }}>

          {/* Hour header */}
          <HourHeader />

          {/* Status rows */}
          {STATUS_ROWS.map(row => (
            <StatusRow key={row.key} row={row} entries={log.entries} />
          ))}

          {/* Remarks strip */}
          <RemarksStrip entries={log.entries} />

          {/* Hour footer */}
          <HourHeader bottom />
        </div>
      </div>

      {/* ── HOURS SUMMARY ────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-2 mt-2">
          {STATUS_ROWS.map(row => (
            <div key={row.key} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: row.color }} />
              <span className="text-xs text-gray-600">{row.label}</span>
              <span className="text-sm font-bold ml-1" style={{ color: row.color }}>
                {(log.hours[row.key] || 0).toFixed(2)}h
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 border-2 border-gray-800 rounded-lg px-3 py-1.5 bg-gray-900 ml-auto">
            <span className="text-xs text-gray-300">TOTAL</span>
            <span className="text-sm font-bold text-white">{(Object.values(log.hours).reduce((a,b)=>a+b,0)).toFixed(2)}h</span>
          </div>
        </div>
      </div>

      {/* ── REMARKS ──────────────────────────────────────────────── */}
      <div className="px-5 pb-4 border-t border-gray-200 pt-3">
        <div className="text-xs font-bold text-gray-700 uppercase mb-2">Remarks</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {log.entries
            .filter(e => e.location || e.remarks)
            .map((e, i) => (
              <div key={i} className="text-xs font-mono text-gray-600">
                <span className="text-gray-400">{fmt12(e.start_hour)}</span>
                {' — '}
                <span className="font-medium">{statusShort(e.status)}</span>
                {e.location && <span className="text-gray-500"> · {e.location.split(',').slice(0, 2).join(',')}</span>}
                {e.remarks && <span className="text-blue-600"> ({e.remarks})</span>}
              </div>
            ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Enter name of place where you reported and were released from work, and when and where each change of duty status occurred. Use time standard of home terminal.
        </p>
      </div>

      {/* ── FOOTER / SIGNATURE ───────────────────────────────────── */}
      <div className="px-5 pb-5 border-t-2 border-gray-300 pt-3 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">Driver's Signature / Certification</div>
          <div className="border-b-2 border-gray-400 h-8 w-full" />
          <div className="text-xs text-gray-400 mt-1 italic">I certify that these entries are true and correct.</div>
        </div>
        <div className="text-xs text-gray-600 space-y-2">
          <div className="font-bold text-gray-800 text-sm">Recap (Complete at end of day)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="text-gray-500">On-duty hours today (lines 3 & 4)</div>
              <div className="font-bold text-gray-900 text-base">{totalOnDuty}h</div>
            </div>
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="text-gray-500">Miles driven today</div>
              <div className="font-bold text-gray-900 text-base">{Math.round(log.total_miles)} mi</div>
            </div>
          </div>
          <div className="text-gray-400">70-Hour / 8-Day Cycle (Property Carrier)</div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

const HOUR_LABELS = [
  'Mid-\nnight','1','2','3','4','5','6','7','8','9','10','11',
  'Noon','1','2','3','4','5','6','7','8','9','10','11','Mid-\nnight',
]

function HourHeader({ bottom = false }) {
  return (
    <div style={{ display: 'flex', marginLeft: LABEL_W, marginRight: TOTAL_W }}>
      {HOUR_LABELS.map((lbl, i) => (
        <div
          key={i}
          style={{
            width: i === 0 || i === 24 ? GRID_W / 48 : GRID_W / 24,
            flexShrink: 0,
            textAlign: 'center',
            fontSize: 8,
            lineHeight: 1.2,
            color: '#6b7280',
            borderLeft: '1px solid #d1d5db',
            paddingTop: bottom ? 2 : 0,
            paddingBottom: bottom ? 0 : 2,
          }}
        >
          {lbl.split('\n').map((l, j) => <div key={j}>{l}</div>)}
        </div>
      ))}
    </div>
  )
}

function StatusRow({ row, entries }) {
  const relevant = entries.filter(e => e.status === row.key)
  const totalH = relevant.reduce((s, e) => s + e.end_hour - e.start_hour, 0)

  return (
    <div style={{ display: 'flex', borderTop: '1px solid #d1d5db', minHeight: ROW_H }}>
      {/* Label */}
      <div
        style={{
          width: LABEL_W,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 8,
          fontSize: 10,
          fontWeight: 600,
          color: '#374151',
          borderRight: '2px solid #9ca3af',
          background: '#f9fafb',
        }}
      >
        {row.label}
      </div>

      {/* SVG grid */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg width={GRID_W} height={ROW_H} style={{ display: 'block' }}>
          {/* Background */}
          <rect width={GRID_W} height={ROW_H} fill="white" />

          {/* Vertical grid lines */}
          {Array.from({ length: 25 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={px(i)} y1={0} x2={px(i)} y2={ROW_H}
              stroke={i % 12 === 0 ? '#374151' : i % 6 === 0 ? '#6b7280' : '#e5e7eb'}
              strokeWidth={i % 12 === 0 ? 1.5 : i % 6 === 0 ? 1 : 0.5}
            />
          ))}

          {/* 15-min tick marks at bottom */}
          {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
            const x = (i / (24 * 4)) * GRID_W
            const isHour = i % 4 === 0
            if (isHour) return null
            const isHalf = i % 2 === 0
            return (
              <line key={`t${i}`}
                x1={x} y1={ROW_H}
                x2={x} y2={ROW_H - (isHalf ? 8 : 5)}
                stroke="#d1d5db" strokeWidth={0.5}
              />
            )
          })}

          {/* Duty bars */}
          {relevant.map((entry, i) => {
            const x = px(entry.start_hour)
            const w = px(entry.end_hour) - x
            if (w <= 0) return null
            return (
              <g key={i}>
                <rect x={x} y={5} width={w} height={ROW_H - 10} fill={row.color} opacity={0.88} rx={2} />
                {/* Center horizontal line (ELD style) */}
                <line x1={x} y1={ROW_H / 2} x2={x + w} y2={ROW_H / 2}
                  stroke="white" strokeWidth={1.5} opacity={0.6} />
                {/* Vertical drop lines at start/end */}
                <line x1={x} y1={0} x2={x} y2={ROW_H} stroke={row.color} strokeWidth={1.5} opacity={0.5} />
                <line x1={x + w} y1={0} x2={x + w} y2={ROW_H} stroke={row.color} strokeWidth={1.5} opacity={0.5} />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Total hours */}
      <div
        style={{
          width: TOTAL_W,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '2px solid #9ca3af',
          fontSize: 12,
          fontWeight: 700,
          color: totalH > 0 ? row.color : '#9ca3af',
          background: '#f9fafb',
        }}
      >
        {totalH.toFixed(2)}
      </div>
    </div>
  )
}

function RemarksStrip({ entries }) {
  /* Show location labels at status-change boundaries */
  const changes = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const prev = entries[i - 1]
    if (!prev || e.status !== prev.status || e.location !== prev.location) {
      changes.push({ hour: e.start_hour, label: e.location?.split(',')[0] || '' })
    }
  }

  return (
    <div style={{ display: 'flex', borderTop: '1px solid #9ca3af' }}>
      <div
        style={{
          width: LABEL_W, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 8, fontSize: 10, fontWeight: 700, color: '#374151',
          borderRight: '2px solid #9ca3af', background: '#f9fafb', minHeight: 32,
        }}
      >
        REMARKS
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <svg width={GRID_W} height={32}>
          {changes.map((c, i) => (
            <g key={i}>
              <line x1={px(c.hour)} y1={0} x2={px(c.hour)} y2={12} stroke="#374151" strokeWidth={1} />
              <text x={px(c.hour) + 2} y={26} fontSize={7} fill="#374151" fontStyle="italic">
                {c.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ width: TOTAL_W, flexShrink: 0, borderLeft: '2px solid #9ca3af', background: '#f9fafb' }} />
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt12(h) {
  const totalMin = Math.round(h * 60)
  const hrs = Math.floor(totalMin / 60) % 24
  const mins = totalMin % 60
  const ap = hrs >= 12 ? 'PM' : 'AM'
  const dh = hrs % 12 || 12
  return `${dh}:${String(mins).padStart(2, '0')} ${ap}`
}

function statusShort(s) {
  return { off_duty: 'Off Duty', sleeper_berth: 'Sleeper Berth', driving: 'Driving', on_duty_not_driving: 'On Duty ND' }[s] || s
}
