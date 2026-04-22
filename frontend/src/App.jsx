import { useState } from 'react'
import TripForm from './components/TripForm'
import RouteMap from './components/RouteMap'
import StopsList from './components/StopsList'
import ELDLogBook from './components/ELDLogBook'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('map')

  async function handleSubmit(formData) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await axios.post(`${API_BASE}/trip-plan/`, formData)
      setResult(res.data)
      setActiveTab('map')
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TruckIcon />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">TruckerLog</h1>
            <p className="text-xs text-slate-400 leading-none mt-0.5">ELD Trip Planner & HOS Calculator</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-800 rounded">FMCSA 70h/8-day</span>
            <span className="px-2 py-1 bg-slate-800 rounded">Property Carrier</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Form */}
        <TripForm onSubmit={handleSubmit} loading={loading} />

        {/* Error */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Total Distance" value={`${result.summary.total_distance_miles} mi`} icon="📍" />
              <SummaryCard label="Driving Hours" value={`${result.summary.total_driving_hours}h`} icon="🚛" />
              <SummaryCard label="Trip Days" value={result.summary.total_days} icon="📅" />
              <SummaryCard label="Total Stops" value={result.summary.total_stops} icon="🅿️" />
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
              {[
                { key: 'map', label: '🗺️ Route Map' },
                { key: 'stops', label: '📍 Stops' },
                { key: 'logs', label: '📋 ELD Logs' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'map' && (
              <RouteMap route={result.route} stops={result.stops} />
            )}
            {activeTab === 'stops' && (
              <StopsList stops={result.stops} />
            )}
            {activeTab === 'logs' && (
              <ELDLogBook dailyLogs={result.daily_logs} route={result.route} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M1 3h15v13H1z"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  )
}
