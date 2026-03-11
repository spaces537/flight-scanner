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

  const { from, to, dateFrom, dateTo, maxStay = 7, weekendsOnly = false } = req.body

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  // If no API key, return mock data for demo
  if (!TEQUILA_API_KEY) {
    return res.status(200).json({
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly)
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
      nights_in_dst_from: '2',
      nights_in_dst_to: String(maxStay),
      flight_type: 'round',
      adults: '1',
      curr: 'EUR',
      sort: 'price',
      limit: '30',
      max_stopovers: '1'
    })

    // Add weekend filter if enabled
    if (weekendsOnly) {
      params.set('fly_days', '4,5') // Thursday, Friday departures
      params.set('ret_fly_days', '0,6') // Sunday, Saturday returns
    }

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
    return res.status(200).json({ 
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly)
    })
  }
}

// Mock data generator for demo/fallback
function generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  const flights = []
  const startDate = new Date(dateFrom)
  const endDate = new Date(dateTo)
  const totalDays = Math.ceil((endDate - startDate) / 86400000)
  
  const airlines = ['Ryanair', 'TUI fly', 'Royal Air Maroc', 'Air Arabia']
  const airlinePrices = { 'Ryanair': 0, 'TUI fly': 20, 'Royal Air Maroc': 40, 'Air Arabia': 10 }
  
  // Generate 15-20 flight options across the date range
  const numFlights = 15 + Math.floor(Math.random() * 6)
  
  for (let i = 0; i < numFlights; i++) {
    let daysOffset = Math.floor(Math.random() * totalDays)
    const outDate = new Date(startDate)
    outDate.setDate(outDate.getDate() + daysOffset)
    
    // If weekends only, adjust to Thursday/Friday
    if (weekendsOnly) {
      const day = outDate.getDay()
      if (day < 4) outDate.setDate(outDate.getDate() + (4 - day))
      else if (day > 5) outDate.setDate(outDate.getDate() + (4 - day + 7))
    }
    
    const nights = 2 + Math.floor(Math.random() * (maxStay - 1))
    const returnDate = new Date(outDate)
    returnDate.setDate(returnDate.getDate() + nights)
    
    // Skip if return is past end date
    if (returnDate > endDate) continue
    
    const airline = airlines[Math.floor(Math.random() * airlines.length)]
    const outHour = 6 + Math.floor(Math.random() * 14)
    const returnHour = 6 + Math.floor(Math.random() * 14)
    
    const outDuration = 150 + Math.floor(Math.random() * 90)
    const returnDuration = 150 + Math.floor(Math.random() * 90)
    
    // Base price with some variance - cheaper midweek
    const dayOfWeek = outDate.getDay()
    const weekdayDiscount = (dayOfWeek >= 1 && dayOfWeek <= 3) ? -25 : 0
    const basePrice = 65 + Math.floor(Math.random() * 80) + airlinePrices[airline] + weekdayDiscount
    
    const outDep = new Date(outDate)
    outDep.setHours(outHour, Math.floor(Math.random() * 60))
    
    const outArr = new Date(outDep)
    outArr.setMinutes(outArr.getMinutes() + outDuration)
    
    const retDep = new Date(returnDate)
    retDep.setHours(returnHour, Math.floor(Math.random() * 60))
    
    const retArr = new Date(retDep)
    retArr.setMinutes(retArr.getMinutes() + returnDuration)
    
    flights.push({
      price: basePrice,
      airlines: [airline],
      nightsAway: nights,
      outbound: {
        departure: outDep.toISOString(),
        arrival: outArr.toISOString(),
        duration: outDuration,
        stops: Math.random() > 0.8 ? 1 : 0
      },
      return: {
        departure: retDep.toISOString(),
        arrival: retArr.toISOString(),
        duration: returnDuration,
        stops: Math.random() > 0.8 ? 1 : 0
      },
      bookingLink: `https://www.skyscanner.net/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/`
    })
  }
  
  return flights.sort((a, b) => a.price - b.price).slice(0, 20)
}
