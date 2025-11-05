import express from "express";
import tools from "../agent/toolsService.js";
import axios from 'axios';

const router = express.Router();

// Amadeus API configuration
const AMADEUS_BASE = process.env.AMADEUS_BASE || 'https://test.api.amadeus.com';
const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

let token = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (token && now < tokenExpiry - 60_000) return token;

  const { data } = await axios.post(
    `${AMADEUS_BASE}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return token;
}

async function searchRealFlights(origin, destination, departDate, returnDate, adults = 1) {
  try {
    const access = await getAccessToken();
    const { data } = await axios.get(`${AMADEUS_BASE}/v2/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${access}` },
      params: {
        originLocationCode: origin.toUpperCase(),
        destinationLocationCode: destination.toUpperCase(),
        departureDate: departDate,
        returnDate: returnDate,
        adults,
        currencyCode: 'USD',
        max: 5
      }
    });
    
    const offers = Array.isArray(data.data) ? data.data : [];
    
    return {
      results: offers.map(offer => {
        const itinerary = offer.itineraries?.[0];
        const segments = itinerary?.segments || [];
        const firstSegment = segments[0];
        const lastSegment = segments[segments.length - 1];
        
        return {
          id: offer.id,
          price: parseFloat(offer.price?.total || 0),
          currency: offer.price?.currency || 'USD',
          carrier: firstSegment?.carrierCode || 'Unknown',
          cabin: 'ECONOMY', // Default for now
          depart: firstSegment?.departure?.at || '',
          arrive: lastSegment?.arrival?.at || '',
          legs: segments.map(seg => ({
            origin: seg.departure?.iataCode,
            destination: seg.arrival?.iataCode,
            durationMinutes: seg.duration?.replace('PT', '').replace('H', '*60+').replace('M', '').split('+').reduce((a, b) => parseInt(a) * 60 + parseInt(b), 0) || 0,
            stops: segments.length - 1
          }))
        };
      })
    };
  } catch (error) {
    console.error('Real flight search failed, falling back to mock:', error.message);
    // Fallback to mock flights if real API fails
    return tools.flightSearch({
      origin, destination, departDate, returnDate, 
      pax: { adults }, cabin: "ECONOMY", maxResults: 5
    });
  }
}

async function searchRealHotels(cityCode, checkIn, checkOut, adults = 1) {
  try {
    const access = await getAccessToken();
    const { data } = await axios.get(`${AMADEUS_BASE}/v3/shopping/hotel-offers`, {
      headers: { Authorization: `Bearer ${access}` },
      params: {
        cityCode: cityCode.toUpperCase(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        includeClosed: false,
        bestRateOnly: true,
        'page[limit]': 5
      }
    });
    
    return data.data?.map(hotel => {
      const cheapest = hotel.offers?.[0];
      return {
        id: hotel.hotel.hotelId,
        name: hotel.hotel.name,
        price: cheapest?.price?.total || 0,
        currency: cheapest?.price?.currency || 'USD',
        rating: hotel.hotel.rating || 0,
        nights: Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)),
        address: hotel.hotel.address?.lines?.[0] || '',
        link: cheapest?.self || '',
        coords: { lat: 0, lon: 0 },
        rooms: 1,
        guests: adults
      };
    }) || [];
  } catch (error) {
    console.error('Real hotel search failed, falling back to mock:', error.message);
    // Fallback to mock hotels if real API fails
    return await tools.hotelSearch({
      city: cityCode, checkIn, checkOut, rooms: 1, guests: adults, maxResults: 5
    }).then(result => result.results);
  }
}

// POST /api/agent/plan
router.post("/plan", async (req, res) => {
  try {
    const body = req.body || {};
    const origin = String(body.origin || "").toUpperCase();
    const destination = String(body.destination || "").toUpperCase();
    const start = String(body.dates?.start || "").slice(0, 10);
    const end = String(body.dates?.end || "").slice(0, 10);
    const budget = Number(body.budget || 0);
    const interests = Array.isArray(body.interests) ? body.interests : [];
    const pax = { adults: Number(body.pax?.adults || 1) };
    const cabin = String(body.cabin || "ECONOMY");

    // Get real flights from Amadeus API
    const flights = await searchRealFlights(origin, destination, start, end, pax.adults);
    
    // Get real hotels from Amadeus API
    const hotels = await searchRealHotels(destination, start, end, pax.adults);
    
    const dailyPlan = tools.buildDailyPlan({
      cityToken: destination, start, end, userInterests: interests
    });

    // Build a couple of options by mixing best flight/hotel picks
    const f0 = flights.results?.[0];
    const f1 = flights.results?.[1] || f0;
    const h0 = hotels?.[0];
    const h1 = hotels?.[1] || h0;

    const opt = (label, f, h, factor = 1) => ({
      label,
      flight: f ? { summary: `${f.carrier} ${f.cabin}`, price: f.price, currency: f.currency } : null,
      hotel: h ? { name: h.name, price: h.price, nights: h.nights, link: h.link } : null,
      dailyPlan: dailyPlan,
      estTotal: Math.round((f?.price || 0) + ((h?.price || 0) * (h?.nights || 0) * factor)),
    });

    const data = {
      trip: { origin, destination, dates: { start, end }, budget },
      options: [
        opt("Best value", f0, h0, 1.0),
        opt("Alternative", f1, h1, 1.05),
      ],
      notes: ["Itinerary is auto-generated; adjust to your taste."]
    };

    res.json({ data, via: "real-flights-and-hotels:agent" });
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

export default router;
