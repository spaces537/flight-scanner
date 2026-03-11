import { useState } from 'react'

const ROUTES = [
  { from: 'BRU', fromName: 'Brussels', to: 'AHU', toName: 'Alhoceima' },
  { from: 'BRU', fromName: 'Brussels', to: 'NDR', toName: 'Nador' },
  { from: 'BRU', fromName: 'Brussels', to: 'OUD', toName: 'Oujda' },
  { from: 'BRU', fromName: 'Brussels', to: 'TNG', toName: 'Tangier' },
  { from: 'CRL', fromName: 'Charleroi', to: 'AHU', toName: 'Alhoceima' },
  { from: 'CRL', fromName: 'Charleroi', to: 'NDR', toName: 'Nador' },
  { from: 'CRL', fromName: 'Charleroi', to: 'OUD', toName: 'Oujda' },
]

const TIMEFRAMES = [
  { value: 1, label: 'Next month' },
  { value: 2, label: 'Next 2 months' },
  { value: 3, label: 'Next 3 months' },
  { value: 6, label: 'Next 6 months' },
]

export default function FlightSearch({ onSearch, loading }) {
  const [route, setRoute] = useState(0)
  const [timeframe, setTimeframe] = useState(3)
  const [maxStay, setMaxStay] = useState(7)
  const [weekendsOnly, setWeekendsOnly] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const r = ROUTES[route]
    
    // Calculate date range
    const today = new Date()
    const dateFrom = new Date(today)
    dateFrom.setDate(dateFrom.getDate() + 1) // Start tomorrow
    
    const dateTo = new Date(today)
    dateTo.setMonth(dateTo.getMonth() + timeframe)
    
    onSearch({
      from: r.from,
      to: r.to,
      fromName: r.fromName,
      toName: r.toName,
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
      maxStay,
      weekendsOnly,
      flexSearch: true
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
        
        {/* Route Selection */}
        <div className="mb-6">
          <label className="block text-purple-200 text-sm font-medium mb-3">Where do you want to go?</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {ROUTES.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRoute(i)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  route === i 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {r.fromName} → {r.toName}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div className="mb-6">
          <label className="block text-purple-200 text-sm font-medium mb-3">When can you travel?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeframe(t.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  timeframe === t.value 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Max Stay */}
          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">
              Trip length: <span className="text-white font-bold">{maxStay} days</span>
            </label>
            <input
              type="range"
              min="2"
              max="14"
              value={maxStay}
              onChange={(e) => setMaxStay(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-purple-300 text-xs mt-1">
              <span>2 days</span>
              <span>1 week</span>
              <span>2 weeks</span>
            </div>
          </div>

          {/* Weekends Only Toggle */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={weekendsOnly}
                  onChange={(e) => setWeekendsOnly(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors duration-300 ${weekendsOnly ? 'bg-purple-600' : 'bg-white/20'}`}></div>
                <div className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${weekendsOnly ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 text-purple-200">Weekends only (Thu-Sun)</span>
            </label>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scanning all dates...
            </>
          ) : (
            <>🔍 Find Cheapest Flights</>
          )}
        </button>

        <p className="text-center text-purple-300/60 text-sm mt-3">
          Scans all dates in the {TIMEFRAMES.find(t => t.value === timeframe)?.label.toLowerCase()} to find the best deals
        </p>
      </div>
    </form>
  )
}
