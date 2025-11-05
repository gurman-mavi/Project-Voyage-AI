// backend/src/routes/hotels.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

const router = express.Router();

// Quick ping to confirm mount
router.get('/ping', (_req, res) => res.json({ ok: true, route: '/api/hotels' }));

/** ultra-light in-memory cache */
const memory = new Map();
function mkey(prefix, obj) {
  const s = JSON.stringify(obj, Object.keys(obj).sort());
  return `${prefix}:${Buffer.from(s).toString('base64')}`;
}
function mget(key) { return memory.get(key); }
function mset(key, val, ttlSec = 300) {
  memory.set(key, val);
  setTimeout(() => memory.delete(key), ttlSec * 1000).unref?.();
}

/** Amadeus OAuth (token cached) */
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

async function aGet(path, params = {}) {
  const access = await getAccessToken();
  const { data } = await axios.get(`${AMADEUS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    params
  });
  return data;
}

/** TTL by proximity to check-in */
function ttlFor(checkInDate) {
  const today = new Date();
  const d = new Date(checkInDate);
  const days = Math.ceil((d - today) / 86400000);
  if (isNaN(days)) return 300; // 5m default
  if (days <= 3) return 120;   // 2m near-term
  if (days <= 14) return 300;  // 5m
  return 900;                  // 15m far future
}

// Protect quota
router.use(rateLimit({ windowMs: 60 * 1000, max: 30 }));

/**
 * GET /api/hotels/search
 * Query:
 *   cityCode=GOI  OR  latitude=..&longitude=..
 *   checkInDate=YYYY-MM-DD
 *   checkOutDate=YYYY-MM-DD
 *   adults=1 (default)
 *   currencyCode=INR (optional)
 *   page[limit], page[offset] (optional)
 */
router.get('/search', async (req, res) => {
  try {
    const {
      cityCode,
      latitude, longitude, radius, radiusUnit,
      checkInDate, checkOutDate,
      adults = '1',
      currencyCode,
      'page[limit]': limit,
      'page[offset]': offset
    } = req.query;

    console.log('🔎 /api/hotels/search', { cityCode, latitude, longitude, checkInDate, checkOutDate, adults });

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'checkInDate and checkOutDate are required.' });
    }
    if (!cityCode && !(latitude && longitude)) {
      return res.status(400).json({ error: 'Provide either cityCode or latitude+longitude.' });
    }

    const query = {
      checkInDate, checkOutDate, adults,
      currencyCode,
      'page[limit]': limit, 'page[offset]': offset,
      includeClosed: false, bestRateOnly: true
    };
    if (cityCode) query.cityCode = cityCode;
    if (latitude && longitude) {
      query.latitude = latitude; query.longitude = longitude;
      if (radius) query.radius = radius;
      if (radiusUnit) query.radiusUnit = radiusUnit;
    }

    const key = mkey('hotelOffers', query);
    const cached = mget(key);
    if (cached) return res.json({ fromCache: true, data: cached });

    const data = await aGet('/v3/shopping/hotel-offers', query);
    mset(key, data, ttlFor(checkInDate));
    res.json({ fromCache: false, data });
  } catch (e) {
    console.error('❌ /api/hotels/search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/hotels/offer/:offerId */
router.get('/offer/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const key = mkey('hotelOffer', { offerId });
    const cached = mget(key);
    if (cached) return res.json({ fromCache: true, data: cached });

    const data = await aGet(`/v3/shopping/hotel-offers/${offerId}`);
    mset(key, data, 180);
    res.json({ fromCache: false, data });
  } catch (e) {
    console.error('❌ /api/hotels/offer error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
