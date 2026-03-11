// Vercel Serverless Function - Flight Search
// Uses Ryanair unofficial API (free!) + fallback mock data

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
    // Try Ryanair API first
    const flights = await searchRyanair(from, to, dateFrom, dateTo, maxStay, weekendsOnly)
    
    if (flights.length > 0) {
      return res.status(200).json({ flights, source: 'ryanair' })
    }
    
    // Fallback to mock data
    return res.status(200).json({
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly),
      source: 'mock'
    })
  } catch (error) {
    console.error('Search error:', error)
    return res.status(200).json({ 
      flights: generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly),
      source: 'mock',
      error: error.message
    })
  }
}

async function searchRyanair(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  const flights = []
  
  // Ryanair API endpoints (unofficial but works)
  const RYANAIR_API = 'https://www.ryanair.com/api/farfnd/v4'
  
  try {
    // Get cheapest fares for the route
    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    
    // Format dates for Ryanair API
    const outboundFrom = startDate.toISOString().split('T')[0]
    const outboundTo = endDate.toISOString().split('T')[0]
    
    // Search for one-way fares first (outbound)
    const outboundUrl = `${RYANAIR_API}/oneWayFares/${from}/${to}/cheapestPerDay?outboundDateFrom=${outboundFrom}&outboundDateTo=${outboundTo}`
    
    const outboundRes = await fetch(outboundUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })
    
    if (!outboundRes.ok) {
      throw new Error(`Ryanair API error: ${outboundRes.status}`)
    }
    
    const outboundData = await outboundRes.json()
    const outboundFares = outboundData.outbound?.fares || []
    
    // For each outbound fare, find return options
    for (const outFare of outboundFares.slice(0, 15)) {
      if (!outFare.price || outFare.unavailable) continue
      
      const outDate = new Date(outFare.departureDate || outFare.day)
      
      // Skip if weekends only filter and not Thu/Fri
      if (weekendsOnly && ![4, 5].includes(outDate.getDay())) continue
      
      // Search for returns within maxStay days
      for (let nights = 2; nights <= maxStay; nights++) {
        const returnDate = new Date(outDate)
        returnDate.setDate(returnDate.getDate() + nights)
        
        if (returnDate > endDate) continue
        
        // Check weekend return filter (Sat/Sun)
        if (weekendsOnly && ![0, 6].includes(returnDate.getDay())) continue
        
        const returnDateStr = returnDate.toISOString().split('T')[0]
        
        // Get return fares
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
            const returnFares = returnData.outbound?.fares || []
            const returnFare = returnFares.find(f => f.day === returnDateStr || f.departureDate?.startsWith(returnDateStr))
            
            if (returnFare && returnFare.price && !returnFare.unavailable) {
              const totalPrice = (outFare.price.value || 0) + (returnFare.price.value || 0)
              
              flights.push({
                price: Math.round(totalPrice),
                airlines: ['Ryanair'],
                nightsAway: nights,
                outbound: {
                  departure: outFare.departureDate || `${outFare.day}T10:00:00`,
                  arrival: outFare.arrivalDate || `${outFare.day}T13:00:00`,
                  duration: 180,
                  stops: 0
                },
                return: {
                  departure: returnFare.departureDate || `${returnDateStr}T14:00:00`,
                  arrival: returnFare.arrivalDate || `${returnDateStr}T17:00:00`,
                  duration: 180,
                  stops: 0
                },
                bookingLink: `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&dateOut=${outFare.day}&dateIn=${returnDateStr}&originIata=${from}&destinationIata=${to}`
              })
            }
          }
        } catch (e) {
          // Skip this return date
        }
      }
    }
    
    // Sort by price and dedupe
    return flights
      .sort((a, b) => a.price - b.price)
      .filter((f, i, arr) => i === arr.findIndex(x => 
        x.outbound.departure === f.outbound.departure && 
        x.return.departure === f.return.departure
      ))
      .slice(0, 20)
      
  } catch (error) {
    console.error('Ryanair API error:', error)
    return []
  }
}

function generateMockFlights(from, to, dateFrom, dateTo, maxStay, weekendsOnly) {
  const flights = []
  const startDate = new Date(dateFrom)
  const endDate = new Date(dateTo)
  const totalDays = Math.ceil((endDate - startDate) / 86400000)
  
  const airlines = ['Ryanair', 'TUI fly', 'Air Arabia']
  
  for (let i = 0; i < 18; i++) {
    let daysOffset = Math.floor(Math.random() * totalDays)
    const outDate = new Date(startDate)
    outDate.setDate(outDate.getDate() + daysOffset)
    
    if (weekendsOnly) {
      const day = outDate.getDay()
      if (day < 4) outDate.setDate(outDate.getDate() + (4 - day))
      else if (day > 5) outDate.setDate(outDate.getDate() + (4 - day + 7))
    }
    
    const nights = 2 + Math.floor(Math.random() * (maxStay - 1))
    const returnDate = new Date(outDate)
    returnDate.setDate(returnDate.getDate() + nights)
    
    if (returnDate > endDate) continue
    
    const airline = airlines[Math.floor(Math.random() * airlines.length)]
    const outHour = 6 + Math.floor(Math.random() * 14)
    const returnHour = 6 + Math.floor(Math.random() * 14)
    const outDuration = 150 + Math.floor(Math.random() * 90)
    const returnDuration = 150 + Math.floor(Math.random() * 90)
    
    const dayOfWeek = outDate.getDay()
    const weekdayDiscount = (dayOfWeek >= 1 && dayOfWeek <= 3) ? -30 : 0
    const basePrice = 49 + Math.floor(Math.random() * 100) + weekdayDiscount
    
    const outDep = new Date(outDate)
    outDep.setHours(outHour, Math.floor(Math.random() * 60))
    const outArr = new Date(outDep.getTime() + outDuration * 60000)
    
    const retDep = new Date(returnDate)
    retDep.setHours(returnHour, Math.floor(Math.random() * 60))
    const retArr = new Date(retDep.getTime() + returnDuration * 60000)
    
    flights.push({
      price: Math.max(39, basePrice),
      airlines: [airline],
      nightsAway: nights,
      outbound: {
        departure: outDep.toISOString(),
        arrival: outArr.toISOString(),
        duration: outDuration,
        stops: Math.random() > 0.9 ? 1 : 0
      },
      return: {
        departure: retDep.toISOString(),
        arrival: retArr.toISOString(),
        duration: returnDuration,
        stops: Math.random() > 0.9 ? 1 : 0
      },
      bookingLink: `https://www.skyscanner.net/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/`
    })
  }
  
  return flights.sort((a, b) => a.price - b.price).slice(0, 20)
}
