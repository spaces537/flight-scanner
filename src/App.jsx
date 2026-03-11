import { useState } from 'react'
import FlightSearch from './components/FlightSearch'
import FlightResults from './components/FlightResults'

function App() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSearch, setLastSearch] = useState(null)

  const searchFlights = async (params) => {
    setLoading(true)
    setError(null)
    setLastSearch(params)
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      setFlights(data.flights || [])
    } catch (err) {
      setError(err.message)
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            ✈️ Cheap Flight Finder
          </h1>
          <p className="text-purple-200 text-lg md:text-xl">
            No dates needed — just tell me where, I'll find the cheapest days to fly
          </p>
        </header>

        {/* Search Form */}
        <FlightSearch onSearch={searchFlights} loading={loading} />

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        <FlightResults 
          flights={flights} 
          loading={loading} 
          searchParams={lastSearch}
        />

        {/* Footer */}
        <footer className="text-center mt-16 text-purple-300/50 text-sm">
          Built for Spaces 🐐 • Find the cheapest flights without picking dates
        </footer>
      </div>
    </div>
  )
}

export default App
