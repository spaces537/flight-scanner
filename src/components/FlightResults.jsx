export default function FlightResults({ flights, loading, searchParams }) {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-white/20 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!searchParams) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="text-6xl mb-4">🌍</div>
        <p className="text-purple-200 text-lg">
          Select your route and dates to find the cheapest flights
        </p>
      </div>
    )
  }

  if (flights.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <div className="bg-white/10 rounded-xl p-8">
          <div className="text-5xl mb-4">😢</div>
          <p className="text-white text-xl font-medium mb-2">No flights found</p>
          <p className="text-purple-200">
            Try different dates or check nearby airports
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        Found {flights.length} flight{flights.length !== 1 ? 's' : ''} 
        <span className="text-purple-300 font-normal text-lg ml-2">
          {searchParams.fromName} ↔ {searchParams.toName}
        </span>
      </h2>

      <div className="space-y-4">
        {flights.map((flight, i) => (
          <FlightCard key={i} flight={flight} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

function FlightCard({ flight, rank }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all duration-300 hover:bg-white/15 ${rank === 1 ? 'border-yellow-500/50 ring-2 ring-yellow-500/30' : 'border-white/10'}`}>
      {rank === 1 && (
        <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full mb-4">
          🏆 Best Deal
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Flight Info */}
        <div className="flex-1">
          {/* Outbound */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-purple-300 text-sm w-16">Outbound</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{formatDate(flight.outbound.departure)}</span>
              <span className="text-purple-300">{formatTime(flight.outbound.departure)}</span>
              <span className="text-purple-400">→</span>
              <span className="text-purple-300">{formatTime(flight.outbound.arrival)}</span>
              <span className="text-purple-400 text-sm">({formatDuration(flight.outbound.duration)})</span>
              {flight.outbound.stops > 0 && (
                <span className="text-orange-400 text-sm">{flight.outbound.stops} stop{flight.outbound.stops > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Return */}
          <div className="flex items-center gap-4">
            <span className="text-purple-300 text-sm w-16">Return</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{formatDate(flight.return.departure)}</span>
              <span className="text-purple-300">{formatTime(flight.return.departure)}</span>
              <span className="text-purple-400">→</span>
              <span className="text-purple-300">{formatTime(flight.return.arrival)}</span>
              <span className="text-purple-400 text-sm">({formatDuration(flight.return.duration)})</span>
              {flight.return.stops > 0 && (
                <span className="text-orange-400 text-sm">{flight.return.stops} stop{flight.return.stops > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Airlines */}
          <div className="mt-2 text-purple-300 text-sm">
            {flight.airlines.join(', ')}
          </div>
        </div>

        {/* Price & Book */}
        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            €{flight.price}
          </div>
          <div className="text-purple-300 text-sm mb-3">
            {flight.nightsAway} nights
          </div>
          <a
            href={flight.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-lg transition-all duration-300"
          >
            Book Now →
          </a>
        </div>
      </div>
    </div>
  )
}
