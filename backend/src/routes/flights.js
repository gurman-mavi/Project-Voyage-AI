// routes/flights.js (ESM)
import express from "express";
import { aGet, aPost } from "../lib/amadeus.js";
import { CATALOG } from "./destinations.js";
const router = express.Router();

// Market-aware heuristic to make prices look realistic when upstream is off
// 1) Per-route override bands (min/max) in INR
// 2) Duration-based curve to estimate a fair price, then clamp to bands
const ROUTE_BANDS_INR = {
  // popular international
  'DEL-LHR': [30000, 72000],
  'BOM-LHR': [30000, 72000],
  'DEL-DXB': [15000, 32000],
  'DEL-SIN': [20000, 38000],
  'DEL-DOH': [14000, 30000],
  'DEL-CDG': [30000, 68000],
  'DEL-FRA': [28000, 68000],
  'DEL-AMS': [28000, 68000],
  'DEL-ZRH': [30000, 70000],
  'DEL-MUC': [30000, 68000],
  'DEL-BER': [28000, 65000],
  'DEL-VIE': [27000, 64000],
  'DEL-CPH': [27000, 64000],
  'DEL-ARN': [27000, 64000],
  'DEL-OSL': [27000, 64000],
  'DEL-MAD': [27000, 64000],
  'DEL-BCN': [27000, 64000],
  'DEL-LIS': [26000, 62000],
  'DEL-JFK': [48000, 115000],
  'DEL-SFO': [60000, 135000],
  // Long-haul to North America (Canada)
  'DEL-YYZ': [45000, 115000],
  'DEL-YVR': [46000, 120000],
  // Long-haul to Oceania
  'DEL-SYD': [48000, 125000],
  'DEL-MEL': [50000, 130000],
  'DEL-AKL': [50000, 130000],
  // India domestic (floors only, keep broad)
  'DEL-BOM': [3000, 11000],
  'BOM-DEL': [3000, 11000],
  'DEL-BLR': [3200, 12000],
  'DEL-MAA': [3400, 13000],
  'DEL-GOI': [2800, 11000],
};

// Fallback duration bands when no specific route range is defined
const DURATION_BANDS_FALLBACK = [
  [2,   4000, 12000],   // very short haul
  [4,   7000, 18000],   // short haul
  [7,  18000, 32000],   // medium haul (raise min)
  [10, 26000, 52000],   // long haul (raise min)
  [14, 45000, 90000],   // very long haul (raise min for far intl)
  [24, 50000, 140000],  // ultra long haul (Oceania/NA west coast)
];

// IATA -> country lookup (from catalog) to detect domestic vs international quickly
const IATA_COUNTRY = new Map((CATALOG || [])
  .filter(x => x.destinationIata && x.country)
  .map(x => [String(x.destinationIata).toUpperCase(), String(x.country).toUpperCase()]));

function isDomesticPair(a, b) {
  const A = IATA_COUNTRY.get(String(a||"").toUpperCase());
  const B = IATA_COUNTRY.get(String(b||"").toUpperCase());
  if (!A || !B) return false;
  return A === B;
}

function parseIsoDurToMinutes(s) {
  if (!s || typeof s !== "string") return null;
  const d = /([0-9]+)D/.exec(s)?.[1];
  const h = /([0-9]+)H/.exec(s)?.[1];
  const m = /([0-9]+)M/.exec(s)?.[1];
  return (d ? Number(d) * 1440 : 0) + (h ? Number(h) * 60 : 0) + (m ? Number(m) : 0);
}

function estimateDurationMinutes(offer) {
  try {
    const it = Array.isArray(offer?.itineraries) && offer.itineraries[0];
    if (!it) return null;
    const segs = Array.isArray(it.segments) ? it.segments : [];
    let mins = parseIsoDurToMinutes(it.duration);
    if (mins == null && segs.length) mins = segs.reduce((sum, s) => sum + (parseIsoDurToMinutes(s?.duration) || 0), 0);
    return mins || null;
  } catch { return null; }
}

function applyMarketHeuristicINR(offers, currencyCode, needFrom, needTo) {
  if (!Array.isArray(offers) || !offers.length) return offers;
  const ccy = String(currencyCode || "INR").toUpperCase();
  if (ccy !== "INR") return offers;
  const routeKey = `${needFrom}-${needTo}`;
  const routeBand = ROUTE_BANDS_INR[routeKey] || null;
  const domestic = isDomesticPair(needFrom, needTo);
  return offers.map((o) => {
    try {
      const mins = estimateDurationMinutes(o);
      const hours = mins ? Math.max(0.5, mins / 60) : null;

      // Duration curve: price ≈ 2500 * hours^1.3 + 4000 (INR)
      // Then clamp to either routeBand or duration fallback band.
      let estimated = hours ? 2500 * Math.pow(hours, 1.3) + 4000 : 12000;
      // add ±15% variance to avoid identical prices
      const jitter = 0.85 + Math.random() * 0.30;
      estimated = estimated * jitter;

      // Defaults: more aggressive min for international, gentler for domestic
  let minBand = domestic ? 2500 : 18000;
  let maxBand = domestic ? 13000 : 90000;
      if (routeBand) {
        [minBand, maxBand] = routeBand;
      } else if (hours != null) {
        const b = DURATION_BANDS_FALLBACK.find(([h]) => hours <= h) || DURATION_BANDS_FALLBACK[DURATION_BANDS_FALLBACK.length - 1];
        minBand = b[1];
        maxBand = b[2];
      }

      const clamped = Math.min(Math.max(estimated, minBand), maxBand);
      const p = o.price || {};
      const total = Number(p.grandTotal ?? p.total ?? 0) || 0;
      // Prefer the higher of upstream total vs. heuristic min, but never exceed maxBand when upstream is unrealistically high
      const next = Math.min(Math.max(total, minBand, clamped), maxBand);
      if (!o.price) o.price = {};
      o.price.currency = "INR";
      o.price.total = String(Math.round(next));
      o.price.grandTotal = String(Math.round(next));
    } catch {}
    return o;
  });
}

// Simple fallback offer builder used when upstream returns 401/5xx
function isoAt(dateStr, hour) {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString().slice(0, 19);
  } catch { return `${dateStr}T08:00:00`; }
}

const ROUTE_FALLBACK_DURATION_H = {
  "DEL-DXB": 3.5,
  "DEL-LHR": 9.0,
  "DEL-SIN": 5.5,
  "DEL-DOH": 4.0,
  "DEL-CDG": 8.5,
  "DEL-FRA": 8.0,
  "DEL-AMS": 8.0,
  "DEL-ZRH": 8.0,
  "DEL-MUC": 8.0,
  "DEL-BER": 8.5,
  "DEL-VIE": 8.0,
  "DEL-CPH": 8.5,
  "DEL-ARN": 8.5,
  "DEL-OSL": 9.0,
  "DEL-MAD": 10.0,
  "DEL-BCN": 10.0,
  "DEL-LIS": 10.0,
  "DEL-JFK": 14.5,
  "DEL-SFO": 17.0,
  "DEL-YYZ": 14.5,
  "DEL-YVR": 16.0,
  "DEL-SYD": 12.5,
  "DEL-MEL": 12.5,
  "DEL-AKL": 16.0,
  // domestic rough guesses
  "DEL-BOM": 2.0,
  "DEL-BLR": 2.5,
  "DEL-MAA": 3.0,
  "DEL-GOI": 2.5,
};

const GLOBAL_HUBS = ["DOH", "DXB", "IST", "FRA", "CDG", "AMS", "ZRH", "MUC"];

function buildFallbackOffers({ originLocationCode, destinationLocationCode, departureDate, returnDate, currencyCode = "INR", max = 6 }) {
  const out = [];
  const key = `${String(originLocationCode||"").toUpperCase()}-${String(destinationLocationCode||"").toUpperCase()}`;
  const durH = ROUTE_FALLBACK_DURATION_H[key] || 3.0;
  const dep = departureDate || new Date().toISOString().slice(0,10);
  const arrH = Math.round(durH);
  const domestic = isDomesticPair(originLocationCode, destinationLocationCode);
  for (let i = 0; i < Math.max(1, Math.min(3, Number(max)||3)); i++) {
    const h = 6 + i * 2;
    const depAt = isoAt(dep, h);

    // Decide stops: domestic often direct; international: prefer 1–2 stops for variety
    const stops = domestic ? 0 : (Math.random() < 0.6 ? 1 : 2);
    if (stops === 0) {
      const arrAt = isoAt(dep, h + arrH);
      out.push({
        type: "flight-offer",
        price: { currency: String(currencyCode||"INR").toUpperCase(), total: "0", grandTotal: "0" },
        itineraries: [
          {
            duration: `PT${arrH}H`,
            segments: [
              {
                carrierCode: "AI",
                number: String(200 + i),
                departure: { iataCode: String(originLocationCode||"").toUpperCase(), at: depAt },
                arrival: { iataCode: String(destinationLocationCode||"").toUpperCase(), at: arrAt },
                duration: `PT${arrH}H`,
              },
            ],
          },
        ],
      });
    } else if (stops === 1) {
      const hub = GLOBAL_HUBS.find(x => x !== String(originLocationCode).toUpperCase() && x !== String(destinationLocationCode).toUpperCase()) || "DOH";
      const leg1H = Math.max(2, Math.round(arrH * 0.45));
      const layH = 2 + (i % 2);
      const leg2H = Math.max(2, arrH - leg1H + (stops === 2 ? 2 : 0));
      const arr1 = isoAt(dep, h + leg1H);
      const dep2 = isoAt(dep, h + leg1H + layH);
      const arr2 = isoAt(dep, h + leg1H + layH + leg2H);
      out.push({
        type: "flight-offer",
        price: { currency: String(currencyCode||"INR").toUpperCase(), total: "0", grandTotal: "0" },
        itineraries: [
          {
            duration: `PT${leg1H + layH + leg2H}H`,
            segments: [
              { carrierCode: "QR", number: String(500 + i), departure: { iataCode: String(originLocationCode||"").toUpperCase(), at: depAt }, arrival: { iataCode: hub, at: arr1 }, duration: `PT${leg1H}H` },
              { carrierCode: "QR", number: String(700 + i), departure: { iataCode: hub, at: dep2 }, arrival: { iataCode: String(destinationLocationCode||"").toUpperCase(), at: arr2 }, duration: `PT${leg2H}H` },
            ],
          },
        ],
      });
    } else {
      // two stops: hub1 -> hub2 -> destination
      const hub1 = GLOBAL_HUBS.find(x => x !== String(originLocationCode).toUpperCase()) || "DXB";
      const hub2 = GLOBAL_HUBS.find(x => x !== hub1 && x !== String(destinationLocationCode).toUpperCase()) || "FRA";
      const leg1H = Math.max(2, Math.round(arrH * 0.35));
      const lay1H = 2;
      const leg2H = Math.max(2, Math.round(arrH * 0.25));
      const lay2H = 2;
      const leg3H = Math.max(2, arrH - leg1H - leg2H);
      const arr1 = isoAt(dep, h + leg1H);
      const dep2 = isoAt(dep, h + leg1H + lay1H);
      const arr2 = isoAt(dep, h + leg1H + lay1H + leg2H);
      const dep3 = isoAt(dep, h + leg1H + lay1H + leg2H + lay2H);
      const arr3 = isoAt(dep, h + leg1H + lay1H + leg2H + lay2H + leg3H);
      out.push({
        type: "flight-offer",
        price: { currency: String(currencyCode||"INR").toUpperCase(), total: "0", grandTotal: "0" },
        itineraries: [
          {
            duration: `PT${leg1H + lay1H + leg2H + lay2H + leg3H}H`,
            segments: [
              { carrierCode: "EK", number: String(800 + i), departure: { iataCode: String(originLocationCode||"").toUpperCase(), at: depAt }, arrival: { iataCode: hub1, at: arr1 }, duration: `PT${leg1H}H` },
              { carrierCode: "EK", number: String(900 + i), departure: { iataCode: hub1, at: dep2 }, arrival: { iataCode: hub2, at: arr2 }, duration: `PT${leg2H}H` },
              { carrierCode: "LH", number: String(1000 + i), departure: { iataCode: hub2, at: dep3 }, arrival: { iataCode: String(destinationLocationCode||"").toUpperCase(), at: arr3 }, duration: `PT${leg3H}H` },
            ],
          },
        ],
      });
    }
  }
  return out;
}

router.get("/search", async (req, res) => {
  try {
    const params = {
      originLocationCode: req.query.originLocationCode,
      destinationLocationCode: req.query.destinationLocationCode,
      departureDate: req.query.departureDate,
      returnDate: req.query.returnDate,
      adults: req.query.adults || "1",
      currencyCode: (req.query.currencyCode || "INR").toUpperCase(),
      max: req.query.limit || "10", // Amadeus max default is 250
    };

    console.log("[🔎 Amadeus] Fetching flight offers with params:", params);

    // Step 1: search offers
    const offersResp = await aGet("/v2/shopping/flight-offers", params);
    const offersAll = Array.isArray(offersResp?.data) ? offersResp.data : [];

    // Filter to strictly match requested origin/destination on the first itinerary
    const needFrom = String(params.originLocationCode || "").toUpperCase();
    const needTo = String(params.destinationLocationCode || "").toUpperCase();
    const offers = offersAll.filter((fo) => {
      try {
        const itin = Array.isArray(fo?.itineraries) && fo.itineraries[0];
        const segs = Array.isArray(itin?.segments) ? itin.segments : [];
        if (!segs.length) return false;
        const from = String(segs[0]?.departure?.iataCode || "").toUpperCase();
        const to = String(segs[segs.length - 1]?.arrival?.iataCode || "").toUpperCase();
        return from === needFrom && to === needTo;
      } catch { return false; }
    });

    // If nothing found, return empty
    if (!offers.length) {
      return res.json({ ok: true, data: [], via: "amadeus" });
    }

    // Step 2: confirm pricing for accurate totals (grandTotal includes taxes/fees)
    // See Amadeus Flight Offers Price API
    try {
      // Cap batch size to avoid payload too large / pricing limits
      const batch = offers.slice(0, 20);
      const pricingBody = {
        data: {
          type: "flight-offers-pricing",
          flightOffers: batch,
          currency: params.currencyCode,
        },
      };
      const priced = await aPost("/v1/shopping/flight-offers/pricing", pricingBody);
      const pricedOffers = Array.isArray(priced?.data?.flightOffers)
        ? priced.data.flightOffers
        : (Array.isArray(priced?.data) ? priced.data : batch);

      const normalized = applyMarketHeuristicINR(pricedOffers, params.currencyCode, needFrom, needTo);
      return res.json({ ok: true, data: normalized, via: "amadeus:priced+floors" });
    } catch (e) {
      console.warn("[⚠️ Pricing failed] Returning unpriced offers:", e?.message || e);
      const normalized = applyMarketHeuristicINR(offers, params.currencyCode, needFrom, needTo);
      return res.json({ ok: true, data: normalized, via: "amadeus:search-only+floors" });
    }
  } catch (err) {
    const code = err?.response?.status || 0;
    console.error("[❌ Amadeus Error]", err.message);
    // Graceful fallback for auth/quota/5xx errors
    if ([401, 403, 429, 500, 502, 503].includes(code)) {
      try {
        const needFrom = String(req.query.originLocationCode || "").toUpperCase();
        const needTo = String(req.query.destinationLocationCode || "").toUpperCase();
        const mock = buildFallbackOffers({
          originLocationCode: needFrom,
          destinationLocationCode: needTo,
          departureDate: req.query.departureDate,
          returnDate: req.query.returnDate,
          currencyCode: (req.query.currencyCode || "INR").toUpperCase(),
          max: req.query.limit || 6,
        });
        const normalized = applyMarketHeuristicINR(mock, (req.query.currencyCode || "INR").toUpperCase(), needFrom, needTo);
        return res.json({ ok: true, data: normalized, via: `fallback:${code}` });
      } catch (e2) {
        console.warn("[fallback build failed]", e2?.message || e2);
      }
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
