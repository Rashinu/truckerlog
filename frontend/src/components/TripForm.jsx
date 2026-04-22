import { useState } from 'react'

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used_hours: '',
  })

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      ...form,
      current_cycle_used_hours: parseFloat(form.current_cycle_used_hours) || 0,
    })
  }

  const examples = [
    {
      label: 'Dallas → OKC → Nashville',
      data: { current_location: 'Dallas, TX', pickup_location: 'Oklahoma City, OK', dropoff_location: 'Nashville, TN', current_cycle_used_hours: '24' }
    },
    {
      label: 'LA → Phoenix → Denver',
      data: { current_location: 'Los Angeles, CA', pickup_location: 'Phoenix, AZ', dropoff_location: 'Denver, CO', current_cycle_used_hours: '0' }
    },
    {
      label: 'Chicago → Indianapolis → Atlanta',
      data: { current_location: 'Chicago, IL', pickup_location: 'Indianapolis, IN', dropoff_location: 'Atlanta, GA', current_cycle_used_hours: '10' }
    },
  ]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Plan Your Trip</h2>
      <p className="text-sm text-slate-400 mb-5">Enter your route details to generate HOS-compliant logs</p>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2 mb-5">
        {examples.map(ex => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setForm(ex.data)}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <FormField
            label="Current Location"
            name="current_location"
            value={form.current_location}
            onChange={handleChange}
            placeholder="e.g. Dallas, TX"
            icon="📍"
            required
          />
          <FormField
            label="Pickup Location"
            name="pickup_location"
            value={form.pickup_location}
            onChange={handleChange}
            placeholder="e.g. Oklahoma City, OK"
            icon="📦"
            required
          />
          <FormField
            label="Dropoff Location"
            name="dropoff_location"
            value={form.dropoff_location}
            onChange={handleChange}
            placeholder="e.g. Nashville, TN"
            icon="🏁"
            required
          />
          <FormField
            label="Current Cycle Used (hrs)"
            name="current_cycle_used_hours"
            value={form.current_cycle_used_hours}
            onChange={handleChange}
            placeholder="0–70"
            icon="⏱️"
            type="number"
            min="0"
            max="70"
            step="0.5"
            required
          />
        </div>

        {/* HOS rules reminder */}
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            '11h max driving/shift',
            '14h driving window',
            '30min break after 8h',
            '70h / 8-day cycle',
            'Fuel every 1,000 mi',
          ].map(rule => (
            <span key={rule} className="text-xs px-2.5 py-1 bg-blue-950/60 border border-blue-900/50 text-blue-300 rounded-full">
              {rule}
            </span>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 justify-center"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculating Route...
            </>
          ) : (
            <>
              🚛 Generate Trip Plan
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function FormField({ label, name, value, onChange, placeholder, icon, type = 'text', ...rest }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {icon} {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        {...rest}
      />
    </div>
  )
}
