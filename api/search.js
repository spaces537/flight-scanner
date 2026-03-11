// Vercel Serverless Function - Flight Search
// Uses Tequila/Kiwi.com API for flight data

const TEQUILA_API_KEY = process.env.TEQUILA_API_KEY || ''
const TEQUILA_BASE = 'https://api.tequila.kiwi.com/v2'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { from, to, dateFrom, dateTo, maxStay = 7 } = req.body

  if (!from || !to || !dateFrom || !dateTo) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  // If no API key, return mock data for demo
  if (!TEQUILA_API_KEY) {
    return res.status(200).json({
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay)
    })
  }

  try {
    const formatDate = (d) => d.split('-').reverse().join('/')
    
    const params = new URLSearchParams({
      fly_from: from,
      fly_to: to,
      date_from: formatDate(dateFrom),
      date_to: formatDate(dateTo),
      return_from: formatDate(dateFrom),
      return_to: formatDate(dateTo),
      nights_in_dst_from: '1',
      nights_in_dst_to: String(maxStay),
      flight_type: 'round',
      adults: '1',
      curr: 'EUR',
      sort: 'price',
      limit: '20',
      max_stopovers: '2'
    })

    const response = await fetch(`${TEQUILA_BASE}/search?${params}`, {
      headers: {
        'apikey': TEQUILA_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    
    const flights = (data.data || []).map(flight => {
      const outboundRoutes = flight.route.filter(r => r.return === 0)
      const returnRoutes = flight.route.filter(r => r.return === 1)
      
      return {
        price: Math.round(flight.price),
        airlines: [...new Set(flight.route.map(r => r.airline))],
        nightsAway: flight.nightsInDest,
        outbound: {
          departure: outboundRoutes[0]?.local_departure,
          arrival: outboundRoutes[outboundRoutes.length - 1]?.local_arrival,
          duration: flight.duration?.departure ? Math.round(flight.duration.departure / 60) : 0,
          stops: outboundRoutes.length - 1
        },
        return: {
          departure: returnRoutes[0]?.local_departure,
          arrival: returnRoutes[returnRoutes.length - 1]?.local_arrival,
          duration: flight.duration?.return ? Math.round(flight.duration.return / 60) : 0,
          stops: returnRoutes.length - 1
        },
        bookingLink: flight.deep_link
      }
    })

    return res.status(200).json({ flights })
  } catch (error) {
    console.error('Flight search error:', error)
    return res.status(500).json({ 
      error: 'Failed to search flights',
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay)
    })
  }
}

// Mock data generator for demo/fallback
function generateMockFlights(from, to, dateFrom, dateTo, maxStay) {
  const flights = []
  const startDate = new Date(dateFrom)
  const endDate = new Date(dateTo)
  
  const airlines = ['Ryanair', 'TUI fly', 'Royal Air Maroc', 'Air Arabia Maroc']
  
  for (let i = 0; i < 8; i++) {
    const daysOffset = Math.floor(Math.random() * ((endDate - startDate) / 86400000))
    const outDate = new Date(startDate)
    outDate.setDate(outDate.getDate() + daysOffset)
    
    const nights = Math.floor(Math.random() * maxStay) + 1
    const returnDate = new Date(outDate)
    returnDate.setDate(returnDate.getDate() + nights)
    
    const outHour = 6 + Math.floor(Math.random() * 14)
    const returnHour = 6 + Math.floor(Math.random() * 14)
    
    const outDuration = 180 + Math.floor(Math.random() * 120)
    const returnDuration = 180 + Math.floor(Math.random() * 120)
    
    const outArrival = new Date(outDate)
    outArrival.setHours(outHour)
    outArrival.setMinutes(outDuration)
    
    const returnArrival = new Date(returnDate)
    returnArrival.setHours(returnHour)
    returnArrival.setMinutes(returnDuration)
    
    const basePrice = 80 + Math.floor(Math.random() * 200)
    
    flights.push({
      price: basePrice + (i * 15),
      airlines: [airlines[Math.floor(Math.random() * airlines.length)]],
      nightsAway: nights,
      outbound: {
        departure: new Date(outDate.setHours(outHour, 0)).toISOString(),
        arrival: outArrival.toISOString(),
        duration: outDuration,
        stops: Math.random() > 0.7 ? 1 : 0
      },
      return: {
        departure: new Date(returnDate.setHours(returnHour, 0)).toISOString(),
        arrival: returnArrival.toISOString(),
        duration: returnDuration,
        stops: Math.random() > 0.7 ? 1 : 0
      },
      bookingLink: `https://www.skyscanner.net/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/`
    })
  }
  
  return flights.sort((a, b) => a.price - b.price)
}
