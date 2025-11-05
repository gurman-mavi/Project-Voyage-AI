// Voyage API — Hotels + City autocomplete (Amadeus) + Google Places photos + Mock Flights
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ Load .env first
dotenv.config();
console.log("DEBUG AMA ID:", process.env.AMADEUS_CLIENT_ID ? "SET" : "MISSING");

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routers (ESM)
import airLookupRouter from "./src/routes/air.lookup.js";
import flightsRouter from "./src/routes/flights.js";
import poiTagsRouter from "./src/routes/poi.tags.js";
import geoResolveRouter from "./src/routes/geo.resolve.js";
import destinationsRouter from "./src/routes/destinations.js";
import imagesRouter from "./src/routes/images.js";
import toolsRouter from "./src/routes/tools.js";
import agentRouter from "./src/routes/agent.js";
import airportsRouter from "./src/routes/airports.js";
import aiRouter from "./src/routes/ai.js";
import tripsRouter from "./src/routes/trips.js";
import authRouter from "./src/routes/auth.js";
import multiAgentRouter from "./src/routes/multiAgent.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/* ----------------------------- Config ----------------------------- */
const PORT = process.env.PORT || 5050;
const AMA_BASE =
  (process.env.AMADEUS_ENV || "test").toLowerCase() === "prod"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

const AMA_TOKEN_URL        = `${AMA_BASE}/v1/security/oauth2/token`;
const AMA_V1_BY_CITY       = `${AMA_BASE}/v1/reference-data/locations/hotels/by-city`;
const AMA_V1_BY_GEOCODE    = `${AMA_BASE}/v1/reference-data/locations/hotels/by-geocode`;
const AMA_V3_HOTEL_OFFERS  = `${AMA_BASE}/v3/shopping/hotel-offers`;
const AMA_V3_OFFER_DETAILS = (offerId) => `${AMA_BASE}/v3/shopping/hotel-offers/${offerId}`;
const AMA_LOCATIONS        = `${AMA_BASE}/v1/reference-data/locations`;

const AX_TIMEOUT = Number(process.env.AMA_TIMEOUT || 20000);
const AX_RETRIES = Number(process.env.AMA_RETRIES || 2);
const CITY_IDS_CAP     = Number(process.env.HOTEL_CITY_IDS_CAP || 20);
const EXPANDED_IDS_CAP = Number(process.env.HOTEL_EXPANDED_IDS_CAP || 50);
const V3_PAGE_LIMIT    = Number(process.env.HOTEL_PAGE_LIMIT || 50);

/* ---------------------- Google Places (photos) -------------------- */
const GP_KEY   = process.env.GOOGLE_PLACES_KEY || "";
const GP_TEXT  = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GP_PHOTO = "https://maps.googleapis.com/maps/api/place/photo";
const PUBLIC_BASE = process.env.PUBLIC_BASE || `http://localhost:${PORT}`;

/* ----------------------------- Helpers --------------------------- */
const ID_OK = /^[A-Z0-9]{8}$/;

function setCache(map, key, val, ttlSec) {
  map.set(key, val);
  setTimeout(() => map.delete(key), ttlSec * 1000).unref?.();
}
function ttlFromCheckIn(checkInDate) {
  const d = new Date(checkInDate);
  const days = Math.ceil((d - new Date()) / 86400000);
  if (isNaN(days)) return 300;
  if (days <= 3) return 120;
  if (days <= 14) return 300;
  return 900;
}
const json404 = (req, res) =>
  res.status(404).json({ error: "Not Found", path: req.originalUrl, method: req.method });

async function axGet(url, { params = {}, headers = {}, timeout = AX_TIMEOUT }, retries = AX_RETRIES) {
  let lastErr;
  for (let i = 0; i < Math.max(1, retries); i++) {
    try {
      return await axios.get(url, { params, headers, timeout, validateStatus: () => true });
    } catch (e) {
      lastErr = e;
      if (i === retries - 1) throw lastErr;
    }
  }
  throw lastErr;
}

/* ------------------------ Auth (cached token) -------------------- */
let AMA_TOKEN = null;
let AMA_EXP = 0;

async function getToken() {
  const now = Date.now();
  if (AMA_TOKEN && now < AMA_EXP - 60_000) return AMA_TOKEN;

  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) throw new Error("amadeus_missing_credentials");

  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", id);
  form.set("client_secret", secret);

  const r = await axios.post(AMA_TOKEN_URL, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });

  AMA_TOKEN = r.data?.access_token;
  const ttl = r.data?.expires_in || 1800;
  AMA_EXP = now + ttl * 1000;
  return AMA_TOKEN;
}

/* --------------------------- Caches ------------------------------ */
const SEARCH_CACHE = new Map();
const OFFER_CACHE  = new Map();
const IDS_CACHE    = new Map();
const CITIES_CACHE = new Map();

// Google Places caches
const PLACE_TXT_CACHE = new Map();

/* ---------------- Aliases / Regions for market fallbacks --------- */
const CITY_ALIASES = { GOI: ["GOI", "GOX"], GOX: ["GOX", "GOI"] };
const getAliases = (code) =>
  [...new Set([String(code).toUpperCase().trim(), ...(CITY_ALIASES[String(code).toUpperCase().trim()] || [])])];

const CITY_REGION = { GOI: "IN", GOX: "IN", DEL: "IN", BOM: "IN", BLR: "IN", MAA: "IN", HYD: "IN", CCU: "IN" };
const REGION_FALLBACKS = { IN: ["BOM", "DEL", "BLR", "MAA"], DEFAULT: ["PAR", "MAD", "BCN", "AMS"] };
function pickFallbackMarkets(cityUpper) {
  const region = CITY_REGION[cityUpper] || "DEFAULT";
  return REGION_FALLBACKS[region] || REGION_FALLBACKS.DEFAULT;
}

/* ---------------------- v1 discovery helpers --------------------- */
async function v1IdsByCityAdaptive(token, cityCode) {
  const city = String(cityCode).toUpperCase().trim();

  let r = await axGet(AMA_V1_BY_CITY, {
    params: { cityCode: city, hotelSource: "ALL" },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!(r.status >= 200 && r.status < 300)) {
    r = await axGet(AMA_V1_BY_CITY, {
      params: { cityCode: city },
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  const ok = r.status >= 200 && r.status < 300;
  const ids = ok
    ? (Array.isArray(r.data?.data) ? r.data.data : [])
        .map((h) => String(h.hotelId || "").toUpperCase().trim())
        .filter((id) => ID_OK.test(id))
    : [];
  return { status: r.status, ids: [...new Set(ids)] };
}

async function v1IdsByGeoAdaptive(token, { lat, lon, radiusKm }) {
  let r = await axGet(AMA_V1_BY_GEOCODE, {
    params: { latitude: lat, longitude: lon, radius: String(radiusKm), radiusUnit: "KM", hotelSource: "ALL" },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!(r.status >= 200 && r.status < 300)) {
    r = await axGet(AMA_V1_BY_GEOCODE, {
      params: { latitude: lat, longitude: lon, radius: String(radiusKm), radiusUnit: "KM" },
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  const ok = r.status >= 200 && r.status < 300;
  const ids = ok
    ? (Array.isArray(r.data?.data) ? r.data.data : [])
        .map((h) => String(h.hotelId || "").toUpperCase().trim())
        .filter((id) => ID_OK.test(id))
    : [];
  return { status: r.status, ids: [...new Set(ids)] };
}

/* -------------------------- v3 search ---------------------------- */
async function v3Offers(token, params) {
  return axGet(AMA_V3_HOTEL_OFFERS, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
}

/* ---------------------- Utility: staged v3 ----------------------- */
async function tryV3WithIds(token, ids, { checkInDate, checkOutDate, adults }, meta, tag) {
  const csv = ids.join(",");
  const r = await v3Offers(token, {
    hotelIds: csv,
    checkInDate,
    checkOutDate,
    adults: String(adults || "1"),
    "page[limit]": String(V3_PAGE_LIMIT),
  });
  const data = Array.isArray(r.data?.data) ? r.data.data : [];
  meta.stage.push({ [`v3_${tag}_dates_status`]: r.status, count: data.length });
  if (data.length) return { data, usedNearestDates: false };

  const rMin = await v3Offers(token, {
    hotelIds: csv,
    adults: String(adults || "1"),
    "page[limit]": String(V3_PAGE_LIMIT),
  });
  const dataMin = Array.isArray(rMin.data?.data) ? rMin.data.data : [];
  meta.stage.push({ [`v3_${tag}_minimal_status`]: rMin.status, count: dataMin.length });
  if (dataMin.length) return { data: dataMin, usedNearestDates: true };

  return { data: [], usedNearestDates: false };
}

/* ---------------------- Google Places helpers -------------------- */
async function gpTextSearch(query) {
  if (!GP_KEY) return null;
  const key = `txt:${query}`;
  const cached = PLACE_TXT_CACHE.get(key);
  if (cached) return cached;

  const r = await axios.get(GP_TEXT, {
    params: { query, type: "lodging", key: GP_KEY },
    timeout: 12000,
    validateStatus: () => true,
  });
  if (r.status !== 200) return null;
  const first = Array.isArray(r.data?.results) ? r.data.results[0] : null;
  if (!first) return null;

  const photoRef = first?.photos?.[0]?.photo_reference || null;
  const placeId = first?.place_id || null;
  const out = { photoRef, placeId };
  setCache(PLACE_TXT_CACHE, key, out, 3600);
  return out;
}

function buildPhotoProxyUrl(photoRef, maxWidth = 1200) {
  if (!photoRef) return null;
  return `${PUBLIC_BASE}/api/photo?ref=${encodeURIComponent(photoRef)}&w=${maxWidth}`;
}

async function enrichWithPhotos(list, cityLabel) {
  if (!GP_KEY || !Array.isArray(list) || !list.length) return list;
  const N = Math.min(list.length, 10);

  await Promise.allSettled(
    list.slice(0, N).map(async (row) => {
      try {
        if (row?.hotel?.image) return;
        const hotelName = row?.hotel?.name;
        const city = row?.hotel?.address?.cityName || cityLabel || "";
        if (!hotelName) return;

        const q = `${hotelName} ${city}`.trim();
        const hit = await gpTextSearch(q);
        if (!hit?.photoRef) return;

        const url = buildPhotoProxyUrl(hit.photoRef, 1200);
        if (url) row.hotel.image = url;
      } catch {}
    })
  );
  return list;
}

/* ----------------------------- Health ---------------------------- */
app.get("/", (_req, res) => res.send("Voyage API OK"));
app.get("/api/health", (_req, res) => res.json({ ok: true, amadeusBase: AMA_BASE }));
app.get("/api/hotels/ping", (_req, res) => res.json({ ok: true, route: "/api/hotels" }));

// --- Minimal FX mock so the frontend currency conversion doesn't fail ---
app.get("/api/fx/latest", (req, res) => {
  const base = String(req.query.base || "INR").toUpperCase();
  const rates = {
    INR: 1,
    USD: 0.012, // ≈ ₹84 → $1
    EUR: 0.011, // ≈ ₹90 → €1
    GBP: 0.0095
  };
  // respond as "base = INR"; if base!=INR you can still send the same (frontend only needs INR-anchored)
  res.json({ base: "INR", rates });
});

/* ------------------------ Hotels: SEARCH ------------------------- */
app.get("/api/hotels/search", async (req, res) => {
  const { cityCode, checkInDate, checkOutDate, adults = "1", strictCity = "0", lat, lon, hotelId, hotelIds } = req.query;
  const explicitIds = String(hotelIds || hotelId || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!checkInDate) return res.status(400).json({ error: "checkInDate_required" });
  if (!checkOutDate) return res.status(400).json({ error: "checkOutDate_required" });

  const cityUpper = String(cityCode || "").toUpperCase().trim();
  const cacheKey = JSON.stringify({
    cityUpper,
    checkInDate,
    checkOutDate,
    adults: String(adults || "1"),
    strictCity,
    lat,
    lon,
    explicitIds
  });
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached) return res.json(cached);

  const meta = { stage: [] };

  try {
    const token = await getToken();

    // If specific hotel IDs are requested, fetch only those for an exact match with Planner suggestions
    if (explicitIds.length > 0) {
      const { data, usedNearestDates } = await tryV3WithIds(
        token,
        explicitIds,
        { checkInDate, checkOutDate, adults },
        meta,
        "explicit"
      );
      if (data.length) {
        for (const h of data) for (const o of h.offers || []) if (o?.id) setCache(OFFER_CACHE, o.id, { offer: o, hotel: h.hotel || null }, 900);
        const enriched = await enrichWithPhotos(data, cityUpper);
        const resp = { fromCache: false, via: "v3:explicit-ids", data: enriched, resolvedCity: cityUpper || null, usedNearestDates, meta };
        setCache(SEARCH_CACHE, cacheKey, resp, ttlFromCheckIn(checkInDate));
        return res.json(resp);
      }
      // If explicit IDs yielded nothing, fall through to normal search as a fallback if city provided
      if (!cityUpper) {
        return res.json({ fromCache: false, via: "v3-empty:explicit", data: [], resolvedCity: null, usedNearestDates: false, meta });
      }
    }

    if (!cityUpper) return res.status(400).json({ error: "cityCode_required" });

    const cityIdsFull = await (async () => {
      const key = `ids:city:${cityUpper}`;
      const c = IDS_CACHE.get(key);
      if (c) {
        meta.stage.push({ ids_city_cache_hit: cityUpper, count: c.length });
        return c;
      }
      const out = new Set();
      for (const code of getAliases(cityUpper)) {
        const { status, ids } = await v1IdsByCityAdaptive(token, code);
        meta.stage.push({ [`city_${code}_status`]: status, [`city_${code}_ids`]: ids.length });
        ids.forEach((id) => out.add(id));
      }
      const arr = [...out];
      setCache(IDS_CACHE, key, arr, 3600);
      return arr;
    })();

    if (cityIdsFull.length) {
      const r1 = await tryV3WithIds(
        token,
        cityIdsFull.slice(0, CITY_IDS_CAP),
        { checkInDate, checkOutDate, adults },
        meta,
        "city20"
      );
      if (r1.data.length) {
        for (const h of r1.data) for (const o of h.offers || []) if (o?.id) setCache(OFFER_CACHE, o.id, { offer: o, hotel: h.hotel || null }, 900);
        const enriched = await enrichWithPhotos(r1.data, cityUpper);
        const resp = {
          fromCache: false,
          via: "v3:v1-city",
          data: enriched,
          resolvedCity: cityUpper,
          usedNearestDates: r1.usedNearestDates,
          meta,
        };
        setCache(SEARCH_CACHE, cacheKey, resp, ttlFromCheckIn(checkInDate));
        return res.json(resp);
      }
    }

    if (strictCity === "1") {
      return res.json({
        fromCache: false,
        via: "v3-empty:strict-city",
        data: [],
        resolvedCity: cityUpper,
        usedNearestDates: false,
        meta,
      });
    }

    if (lat && lon) {
      const geoKey = `ids:geo:${cityUpper}:${lat}:${lon}`;
      let geoIds = IDS_CACHE.get(geoKey);
      if (!geoIds) {
        const out = new Set();
        for (const R of [10, 25, 50]) {
          const { status, ids } = await v1IdsByGeoAdaptive(token, { lat, lon, radiusKm: R });
          meta.stage.push({ [`geo_${R}_status`]: status, [`geo_${R}_ids`]: ids.length });
          ids.forEach((id) => out.add(id));
        }
        geoIds = [...out];
        setCache(IDS_CACHE, geoKey, geoIds, 3600);
      } else {
        meta.stage.push({ ids_geo_cache_hit: cityUpper, count: geoIds.length });
      }

      const merged = [...new Set([...(cityIdsFull || []), ...geoIds])].slice(0, EXPANDED_IDS_CAP);
      if (merged.length) {
        const r2 = await tryV3WithIds(
          token,
          merged,
          { checkInDate, checkOutDate, adults },
          meta,
          "city+geo50"
        );
        if (r2.data.length) {
          for (const h of r2.data) for (const o of h.offers || []) if (o?.id) setCache(OFFER_CACHE, o.id, { offer: o, hotel: h.hotel || null }, 900);
          const enriched = await enrichWithPhotos(r2.data, cityUpper);
          const resp = {
            fromCache: false,
            via: "v3:v1-city+geo",
            data: enriched,
            resolvedCity: cityUpper,
            usedNearestDates: r2.usedNearestDates,
            meta,
          };
          setCache(SEARCH_CACHE, cacheKey, resp, ttlFromCheckIn(checkInDate));
          return res.json(resp);
        }
      }
    }

    for (const market of pickFallbackMarkets(cityUpper).concat(REGION_FALLBACKS.DEFAULT)) {
      const mIds = (await v1IdsByCityAdaptive(token, market)).ids.slice(0, CITY_IDS_CAP);
      if (!mIds.length) continue;
      const rM = await tryV3WithIds(token, mIds, { checkInDate, checkOutDate, adults }, meta, `market_${market}`);
      if (rM.data.length) {
        for (const h of rM.data) for (const o of h.offers || []) if (o?.id) setCache(OFFER_CACHE, o.id, { offer: o, hotel: h.hotel || null }, 900);
        const enriched = await enrichWithPhotos(rM.data, cityUpper);
        const resp = {
          fromCache: false,
          via: `v3-market(${market})`,
          data: enriched,
          resolvedCity: market,
          usedNearestDates: rM.usedNearestDates,
          meta,
        };
        setCache(SEARCH_CACHE, cacheKey, resp, 300);
        return res.json(resp);
      }
    }

    return res.json({
      fromCache: false,
      via: "v3-empty:staged",
      data: [],
      resolvedCity: cityUpper,
      usedNearestDates: false,
      meta,
    });
  } catch (e) {
    const metaErr = { api: e.response?.data || null, message: e.message, stage: meta.stage };
    return res
      .status(200)
      .json({ fromCache: false, via: "error", data: [], resolvedCity: null, usedNearestDates: false, meta: metaErr });
  }
});

/* --------------------- Hotels: OFFER DETAILS --------------------- */
app.get("/api/hotels/offer/:offerId", async (req, res) => {
  const { offerId } = req.params;
  try {
    const cached = OFFER_CACHE.get(offerId);
    if (cached) return res.json({ fromCache: true, data: cached });

    const token = await getToken();
    const r = await axGet(AMA_V3_OFFER_DETAILS(offerId), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (r.status < 200 || r.status >= 300) {
      return res.status(200).json({ fromCache: false, data: null, meta: { api: r.data, status: r.status } });
    }

    setCache(OFFER_CACHE, offerId, r.data, 300);
    return res.json({ fromCache: false, data: r.data });
  } catch (e) {
    const api = e.response?.data || null;
    return res.status(200).json({ fromCache: false, data: null, meta: { api, message: e.message } });
  }
});

/* ---------------- City / Airport Autocomplete -------------------- */
app.get("/api/cities", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.max(1, Math.min(15, Number(req.query.limit || 10)));
  if (q.length < 2) return res.json({ ok: true, data: [] });

  const cacheKey = `${q.toUpperCase()}|${limit}`;
  const cached = CITIES_CACHE.get(cacheKey);
  if (cached) return res.json({ ok: true, data: cached, fromCache: true });

  try {
    const token = await getToken();
    const r = await axGet(AMA_LOCATIONS, {
      params: {
        subType: "CITY,AIRPORT",
        keyword: q,
        "page[limit]": String(limit * 3),
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const rows = Array.isArray(r.data?.data) ? r.data.data : [];
    const pick = new Map();

    for (const it of rows) {
      const code = (it.iataCode || "").toUpperCase();
      if (!code) continue;

      const subType = it.subType;
      const country = it.address?.countryName || it.address?.countryCode || "";
      const lat = it.geoCode?.latitude ?? null;
      const lon = it.geoCode?.longitude ?? null;

      const airportCity =
        it.address?.cityName ||
        it.address?.cityNameEn ||
        it.address?.stateCode ||
        "";

      const name = subType === "AIRPORT" && airportCity ? `${it.name} — ${airportCity}` : it.name;
      const display = country ? `${name}, ${country}` : name;

      const current = {
        code,
        name,
        city: airportCity || it.name,
        country,
        subType,
        lat,
        lon,
        display,
      };

      const prev = pick.get(code);
      if (!prev || (prev.subType !== "CITY" && subType === "CITY")) {
        pick.set(code, current);
      }
    }

    const out = Array.from(pick.values()).slice(0, limit);
    setCache(CITIES_CACHE, cacheKey, out, 60);
    res.json({ ok: true, data: out });
  } catch (e) {
    res.status(200).json({ ok: false, data: [], meta: { message: e.message } });
  }
});

/* ---------------------- Google Photo Proxy ----------------------- */
app.get("/api/photo", async (req, res) => {
  try {
    if (!GP_KEY) return res.status(503).send("Photo service not configured");
    const ref = String(req.query.ref || "").trim();
    const w = Math.max(200, Math.min(1600, Number(req.query.w || 1200)));
    if (!ref) return res.status(400).send("Missing ref");

    const r = await axios.get(GP_PHOTO, {
      params: { maxwidth: String(w), photo_reference: ref, key: GP_KEY },
      responseType: "arraybuffer",
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    if (!(r.status >= 200 && r.status < 300)) return res.status(502).send("Upstream error");

    const ct = r.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.end(r.data);
  } catch (e) {
    console.error("PHOTO proxy error:", e.message);
    return res.status(500).send("Photo proxy failed");
  }
});

// Use the real flights router (priced and normalized)
app.use("/api/flights", flightsRouter);

/* ---------------------- Mount Routers ---------------------------- */
app.use("/api/air", airLookupRouter);
app.use("/api/poi", poiTagsRouter);
app.use("/api/geo", geoResolveRouter);
app.use("/api/destinations", destinationsRouter);
app.use("/api/images", imagesRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/airports", airportsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/multi-agent", multiAgentRouter);

/* ---------------------------- 404 JSON --------------------------- */
app.use(json404);

/* ---------------------------- START ------------------------------ */
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
