import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

// If you have auth routes, keep this import. Otherwise remove it.
import authRoutes from './routes/auth.js';

import flightsRouter from "./routes/flights.js";
import airportsRouter from "./routes/airports.js";
import agentRouter from "./routes/agent.js";
import aiRouter from "./routes/ai.js";
import imagesRouter from "./routes/images.js";
dotenv.config();

const app = express();

// ---------- Core middleware ----------
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ---------- Health (must return JSON) ----------
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'voyage-ai-backend',
    envPort: process.env.PORT || 5050,
    amadeusBase: (() => {
      const env = String(process.env.AMADEUS_ENV || 'test').toLowerCase();
      return process.env.AMADEUS_BASE || (env === 'test'
        ? 'https://test.api.amadeus.com'
        : 'https://api.amadeus.com');
    })()
  });
});

// ---------- Hotels (inline, production-ready, no temp hacks) ----------

// Small in-memory cache to save Amadeus quota
const cache = new Map();
function setCache(key, value, ttlSec = 300) {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttlSec * 1000).unref?.();
}
function ttlFor(checkInDate) {
  const d = new Date(checkInDate);
  const days = Math.ceil((d - new Date()) / 86400000);
  if (isNaN(days)) return 300;  // 5m default
  if (days <= 3) return 120;    // 2m near-term
  if (days <= 14) return 300;   // 5m
  return 900;                   // 15m far future
}

// Resolve Amadeus base URL (case-insensitive env)
const AMADEUS_BASE = (() => {
  const env = String(process.env.AMADEUS_ENV || 'test').toLowerCase();
  return process.env.AMADEUS_BASE || (env === 'test'
    ? 'https://test.api.amadeus.com'
    : 'https://api.amadeus.com');
})();

// OAuth token cache
let tokenValue = null;
let tokenExp = 0;

async function getAccessToken() {
  const now = Date.now();
  if (tokenValue && now < tokenExp - 60_000) return tokenValue;

  const { data } = await axios.post(
    `${AMADEUS_BASE}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  tokenValue = data.access_token;
  tokenExp = Date.now() + data.expires_in * 1000;
  return tokenValue;
}

async function aGet(path, params = {}) {
  const access = await getAccessToken();
  const { data } = await axios.get(`${AMADEUS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    params,
  });
  return data;
}

// Simple ping so you can verify mount quickly
app.get('/api/hotels/ping', (_req, res) => res.json({ ok: true, route: '/api/hotels' }));
app.use("/api/flights", flightsRouter);
app.use("/api/airports", airportsRouter);
/**
 * GET /api/hotels/search
 * Query:
 *   - cityCode=GOI  OR  latitude=..&longitude=..
 *   - checkInDate=YYYY-MM-DD
 *   - checkOutDate=YYYY-MM-DD
 *   - adults=1 (default)
 *   - currencyCode=INR (optional)
 *   - page[limit], page[offset] (optional)
 */
app.get('/api/hotels/search', async (req, res) => {
  try {
    const {
      cityCode,
      latitude, longitude, radius, radiusUnit,
      checkInDate, checkOutDate,
      adults = '1',
      currencyCode,
      'page[limit]': limit,
      'page[offset]': offset,
    } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'checkInDate and checkOutDate are required.' });
    }
    if (!cityCode && !(latitude && longitude)) {
      return res.status(400).json({ error: 'Provide either cityCode or latitude+longitude.' });
    }

    const q = {
      checkInDate, checkOutDate, adults,
      currencyCode,
      'page[limit]': limit, 'page[offset]': offset,
      includeClosed: false,
      bestRateOnly: true,
    };
    if (cityCode) q.cityCode = cityCode;
    if (latitude && longitude) {
      q.latitude = latitude; q.longitude = longitude;
      if (radius) q.radius = radius;
      if (radiusUnit) q.radiusUnit = radiusUnit;
    }

    const key = `hotelOffers:${JSON.stringify(q, Object.keys(q).sort())}`;
    const cached = cache.get(key);
    if (cached) return res.json({ fromCache: true, data: cached });

    const data = await aGet('/v3/shopping/hotel-offers', q);
    setCache(key, data, ttlFor(checkInDate));
    res.json({ fromCache: false, data });
  } catch (e) {
    console.error('❌ /api/hotels/search:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/hotels/offer/:offerId */
app.get('/api/hotels/offer/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const key = `hotelOffer:${offerId}`;
    const cached = cache.get(key);
    if (cached) return res.json({ fromCache: true, data: cached });

    const data = await aGet(`/v3/shopping/hotel-offers/${offerId}`);
    setCache(key, data, 180); // short TTL for details
    res.json({ fromCache: false, data });
  } catch (e) {
    console.error('❌ /api/hotels/offer:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Your other routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRouter);
app.use('/api/ai', aiRouter);
app.use('/api/images', imagesRouter);

// ---------- JSON 404 (never HTML) ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl, method: req.method });
});

// ---------- DB + server ----------
const PORT = process.env.PORT || 5050;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 API on http://localhost:${PORT}`);
      console.log('✅ Hotels endpoints ready at /api/hotels/*');
    });
  })
  .catch(err => {
    console.error('Mongo error:', err.message);
    process.exit(1);
  });
