import { useState } from 'react'
import ELDLogSheet from './ELDLogSheet'

export default function ELDLogBook({ dailyLogs, route }) {
  const [currentDay, setCurrentDay] = useState(0)

  if (!dailyLogs || dailyLogs.length === 0) return null

  const log = dailyLogs[currentDay]

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">ELD Daily Log Sheets</h3>
          <span className="text-xs text-slate-400">{dailyLogs.length} log sheet{dailyLogs.length > 1 ? 's' : ''} total</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {dailyLogs.map((dl, i) => (
            <button
              key={i}
              onClick={() => setCurrentDay(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentDay === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {dl.date_label}
            </button>
          ))}
        </div>
      </div>

      {/* Print hint */}
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span>💡 Tip: Use browser print (Ctrl+P) to save individual log sheets as PDF</span>
      </div>

      {/* Log sheet */}
      <ELDLogSheet log={log} route={route} dayIndex={currentDay} />
    </div>
  )
}
