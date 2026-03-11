import { useState } from 'react'

const ROUTES = [
  { from: 'BRU', fromName: 'Brussels', to: 'AHU', toName: 'Alhoceima' },
  { from: 'BRU', fromName: 'Brussels', to: 'NDR', toName: 'Nador' },
  { from: 'BRU', fromName: 'Brussels', to: 'OUD', toName: 'Oujda' },
  { from: 'BRU', fromName: 'Brussels', to: 'TNG', toName: 'Tangier' },
  { from: 'CRL', fromName: 'Charleroi', to: 'AHU', toName: 'Alhoceima' },
  { from: 'CRL', fromName: 'Charleroi', to: 'NDR', toName: 'Nador' },
]

export default function FlightSearch({ onSearch, loading }) {
  const [route, setRoute] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [maxStay, setMaxStay] = useState(7)

  const handleSubmit = (e) => {
    e.preventDefault()
    const r = ROUTES[route]
    onSearch({
      from: r.from,
      to: r.to,
      fromName: r.fromName,
      toName: r.toName,
      dateFrom,
      dateTo,
      maxStay
    })
  }

  // Default dates: next 3 months
  const today = new Date()
  const minDate = today.toISOString().split('T')[0]
  const maxDate = new Date(today.setMonth(today.getMonth() + 3)).toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Route */}
          <div className="lg:col-span-2">
            <label className="block text-purple-200 text-sm font-medium mb-2">Route</label>
            <select
              value={route}
              onChange={(e) => setRoute(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {ROUTES.map((r, i) => (
                <option key={i} value={i} className="bg-slate-800">
                  {r.fromName} → {r.toName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              min={minDate}
              max={maxDate}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || minDate}
              max={maxDate}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Max Stay */}
        <div className="mt-4">
          <label className="block text-purple-200 text-sm font-medium mb-2">
            Max Stay: {maxStay} days
          </label>
          <input
            type="range"
            min="2"
            max="14"
            value={maxStay}
            onChange={(e) => setMaxStay(Number(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Searching...
            </>
          ) : (
            <>🔍 Find Cheap Flights</>
          )}
        </button>
      </div>
    </form>
  )
}
