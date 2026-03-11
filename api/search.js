// Vercel Serverless Function - Flight Search
// Uses Ryanair API (free) + Amadeus API (for other airlines)

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || ''
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || ''

let amadeusToken = null
let tokenExpiry = 0

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiry) return amadeusToken
  
  const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`
  })
  
  if (!response.ok) throw new Error('Amadeus auth failed')
  const data = await response.json()
  amadeusToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return amadeusToken
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { from, to, dateFrom, dateTo, maxStay = 7, weekendsOnly = false } = req.body

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    // Search both APIs in parallel
    const [ryanairFlights, amadeusFlights] = await Promise.all([
      searchRyanair(from, to, dateFrom, dateTo, maxStay, weekendsOnly).catch(() => []),
      searchAmadeus(from, to, dateFrom, dateTo, maxStay, weekendsOnly).catch(() => [])
    ])
    
    // Combine and sort by price
    const allFlights = [...ryanairFlights, ...amadeusFlights]
      .sort((a, b) => a.price - b.price)
      .slice(0, 25)
    
    if (allFlights.length > 0) {
      return res.status(200).json({ 
        flights: allFlights,
        sources: {
          ryanair: ryanairFlights.length,
          amadeus: amadeusFlights.length
        }
      })
    }
    
    // Fallback to mock
    return res.status(200).json({
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly),
      sources: { mock: true }
    })
  } catch (error) {
    console.error('Search error:', error)
    return res.status(200).json({ 
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly),
      error: error.message
    })
  }
}

async function searchAmadeus(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) return []
  
  const flights = []
  const token = await getAmadeusToken()
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  
  // Sample dates (every 4 days to save API calls)
  const datesToCheck = []
  const current = new Date(start)
  while (current <= end && datesToCheck.length < 8) {
    if (!weekendsOnly || [4, 5].includes(current.getDay())) {
      datesToCheck.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 4)
  }
  
  for (const departDate of datesToCheck) {
    for (let nights = 3; nights <= maxStay; nights += 2) {
      const returnDate = new Date(departDate)
      returnDate.setDate(returnDate.getDate() + nights)
      if (returnDate > end) continue
      
      if (weekendsOnly && ![0, 6].includes(returnDate.getDay())) continue
      
      try {
        const params = new URLSearchParams({
          originLocationCode: from,
          destinationLocationCode: to,
          departureDate: departDate,
          returnDate: returnDate.toISOString().split('T')[0],
          adults: '1',
          currencyCode: 'EUR',
          max: '3'
        })
        
        const response = await fetch(
          `https://api.amadeus.com/v2/shopping/flight-offers?${params}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        
        if (response.ok) {
          const data = await response.json()
          for (const offer of (data.data || [])) {
            const outbound = offer.itineraries[0]
            const returnFlight = offer.itineraries[1]
            
            flights.push({
              price: Math.round(parseFloat(offer.price.total)),
              airlines: [...new Set(outbound.segments.map(s => s.carrierCode))],
              nightsAway: nights,
              outbound: {
                departure: outbound.segments[0].departure.at,
                arrival: outbound.segments[outbound.segments.length - 1].arrival.at,
                duration: parseDuration(outbound.duration),
                stops: outbound.segments.length - 1
              },
              return: {
                departure: returnFlight.segments[0].departure.at,
                arrival: returnFlight.segments[returnFlight.segments.length - 1].arrival.at,
                duration: parseDuration(returnFlight.duration),
                stops: returnFlight.segments.length - 1
              },
              bookingLink: `https://www.google.com/travel/flights?q=flights%20${from}%20to%20${to}%20${departDate}`,
              source: 'amadeus'
            })
          }
        }
      } catch (e) {
        console.error('Amadeus search error:', e)
      }
    }
  }
  
  return flights
}

async function searchRyanair(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  const flights = []
  const RYANAIR_API = 'https://www.ryanair.com/api/farfnd/v4'
  
  try {
    const outboundUrl = `${RYANAIR_API}/oneWayFares/${from}/${to}/cheapestPerDay?outboundDateFrom=${dateFrom}&outboundDateTo=${dateTo}`
    
    const outboundRes = await fetch(outboundUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })
    
    if (!outboundRes.ok) return []
    
    const outboundData = await outboundRes.json()
    const outboundFares = outboundData.outbound?.fares || []
    const endDate = new Date(dateTo)
    
    for (const outFare of outboundFares.slice(0, 12)) {
      if (!outFare.price || outFare.unavailable) continue
      
      const outDate = new Date(outFare.day)
      if (weekendsOnly && ![4, 5].includes(outDate.getDay())) continue
      
      for (let nights = 2; nights <= maxStay; nights += 2) {
        const returnDate = new Date(outDate)
        returnDate.setDate(returnDate.getDate() + nights)
        if (returnDate > endDate) continue
        if (weekendsOnly && ![0, 6].includes(returnDate.getDay())) continue
        
        const returnDateStr = returnDate.toISOString().split('T')[0]
        
        try {
          const returnUrl = `${RYANAIR_API}/oneWayFares/${to}/${from}/cheapestPerDay?outboundDateFrom=${returnDateStr}&outboundDateTo=${returnDateStr}`
          
          const returnRes = await fetch(returnUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          })
          
          if (returnRes.ok) {
            const returnData = await returnRes.json()
            const returnFare = (returnData.outbound?.fares || []).find(f => 
              f.day === returnDateStr && f.price && !f.unavailable
            )
            
            if (returnFare) {
              flights.push({
                price: Math.round((outFare.price.value || 0) + (returnFare.price.value || 0)),
                airlines: ['FR'],
                nightsAway: nights,
                outbound: {
                  departure: `${outFare.day}T${outFare.departureTime || '10:00'}:00`,
                  arrival: `${outFare.day}T${outFare.arrivalTime || '13:00'}:00`,
                  duration: 180,
                  stops: 0
                },
                return: {
                  departure: `${returnDateStr}T${returnFare.departureTime || '14:00'}:00`,
                  arrival: `${returnDateStr}T${returnFare.arrivalTime || '17:00'}:00`,
                  duration: 180,
                  stops: 0
                },
                bookingLink: `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&dateOut=${outFare.day}&dateIn=${returnDateStr}&originIata=${from}&destinationIata=${to}`,
                source: 'ryanair'
              })
            }
          }
        } catch (e) {}
      }
    }
    
    return flights.sort((a, b) => a.price - b.price).slice(0, 15)
  } catch (error) {
    console.error('Ryanair error:', error)
    return []
  }
}

function parseDuration(iso) {
  const match = iso?.match(/PT(\d+)H(?:(\d+)M)?/)
  return match ? parseInt(match[1]) * 60 + (parseInt(match[2]) || 0) : 180
}

function generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  const flights = []
  const startDate = new Date(dateFrom)
  const endDate = new Date(dateTo)
  const totalDays = Math.ceil((endDate - startDate) / 86400000)
  
  for (let i = 0; i < 15; i++) {
    const outDate = new Date(startDate)
    outDate.setDate(outDate.getDate() + Math.floor(Math.random() * totalDays))
    
    if (weekendsOnly) {
      const day = outDate.getDay()
      if (day < 4) outDate.setDate(outDate.getDate() + (4 - day))
      else if (day > 5) outDate.setDate(outDate.getDate() + (11 - day))
    }
    
    const nights = 2 + Math.floor(Math.random() * (maxStay - 1))
    const returnDate = new Date(outDate)
    returnDate.setDate(returnDate.getDate() + nights)
    if (returnDate > endDate) continue
    
    const airlines = ['FR', 'AT', 'TB']
    const airline = airlines[Math.floor(Math.random() * airlines.length)]
    const price = 45 + Math.floor(Math.random() * 120)
    
    const outDep = new Date(outDate.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60)))
    const retDep = new Date(returnDate.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60)))
    
    flights.push({
      price,
      airlines: [airline],
      nightsAway: nights,
      outbound: { departure: outDep.toISOString(), arrival: new Date(outDep.getTime() + 180*60000).toISOString(), duration: 180, stops: 0 },
      return: { departure: retDep.toISOString(), arrival: new Date(retDep.getTime() + 180*60000).toISOString(), duration: 180, stops: 0 },
      bookingLink: `https://www.skyscanner.net/transport/flights/${from}/${to}/`,
      source: 'mock'
    })
  }
  
  return flights.sort((a, b) => a.price - b.price)
}
