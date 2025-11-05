// backend/src/agent/orchestrator.js
import {
    flightSearch,
    hotelSearch,
    poiDiscover,
    weatherForecast,
    utils
  } from "./toolsService.js";
  
  /**
   * Expected input:
   * {
   *   origin: "DEL",
   *   destination: "IST",          // IATA or city token (mock accepts either)
   *   dates: { start: "2025-10-10", end: "2025-10-16" },
   *   budget: 1200,
   *   interests: ["Culture","Food"],
   *   pax?: { adults: 1 },
   *   cabin?: "ECONOMY"
   * }
   */
  export async function planTrip(intent = {}) {
    const origin = String(intent.origin || "").toUpperCase();
    const destination = String(intent.destination || intent.city || "").toUpperCase();
    const start = intent?.dates?.start;
    const end = intent?.dates?.end;
  
    if (!origin || !destination || !start || !end) {
      throw new Error("origin, destination, dates.start and dates.end are required");
    }
  
    const budget = Number(intent.budget || 0);
    const interests = Array.isArray(intent.interests) ? intent.interests : [];
    const pax = intent.pax || { adults: 1 };
    const cabin = intent.cabin || "ECONOMY";
  
    // 1) Flights
    const fRes = await flightSearch({
      origin,
      destination,
      departDate: start,
      returnDate: end,
      pax,
      cabin,
      maxResults: 6
    });
    const flights = (fRes?.results || []).sort((a, b) => a.price - b.price).slice(0, 3);
  
    // 2) Hotels
    const hRes = await hotelSearch({
      city: destination,
      checkIn: start,
      checkOut: end,
      rooms: 1,
      guests: pax.adults || 1,
      maxResults: 8
    });
    const hotels = (hRes?.results || []).sort((a, b) => a.price - b.price).slice(0, 3);
  
    // 3) POIs + Weather
    const poiRes = await poiDiscover({ city: destination, interests, limit: 12 });
    const poiList = poiRes?.results || [];
  
    const dayCount = utils.daysBetween(start, end);
    const wxRes = await weatherForecast({ city: destination, start, days: dayCount + 1 });
    const weatherByDate = new Map((wxRes?.daily || []).map(d => [d.date, d]));
  
    // Build a simple daily plan: 3 blocks per day picked from POIs in order.
    const dates = utils.listDates(start, end);
    const dailyPlan = dates.map((date, dIndex) => {
      const picks = [];
      for (let i = 0; i < 3; i++) {
        if (!poiList.length) break;
        const p = poiList[(dIndex * 3 + i) % poiList.length];
        picks.push({
          time: ["09:30", "13:30", "18:30"][i],
          title: p.name,
          notes: (p.tags || []).join(", ")
        });
      }
      return { date, weather: weatherByDate.get(date) || null, blocks: picks };
    });
  
    // 4) Compose 2 options (best value + alternate)
    const options = [];
    const pairCount = Math.min(2, flights.length, hotels.length);
    for (let i = 0; i < pairCount; i++) {
      const fl = flights[i];
      const ho = hotels[i];
      const nights = ho.nights || dayCount;
      const estTotal = Math.round(fl.price + ho.price * nights);
  
      options.push({
        label: i === 0 ? "Best value" : "Alternate",
        flight: {
          id: fl.id,
          price: fl.price,
          currency: fl.currency,
          carrier: fl.carrier,
          summary: `${fl.carrier} ${fl.legs?.[0]?.stops ? "1 stop" : "nonstop"}`
        },
        hotel: {
          id: ho.id,
          name: ho.name,
          price: ho.price,
          currency: ho.currency,
          nights,
          link: ho.link
        },
        dailyPlan,
        estTotal
      });
    }
  
    return {
      trip: {
        origin,
        destination,
        dates: { start, end },
        budget,
        theme: interests
      },
      options,
      notes: [
        "This is a deterministic demo plan. Swap toolsService internals to go live.",
        "Daily plan balances 3 experiences per day and attaches forecast per day."
      ]
    };
  }
  