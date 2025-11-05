// backend/src/routes/geo.resolve.js
import express from "express";
import axios from "axios";
import getAmadeus from "../lib/amadeus-sdk.js";

const router = express.Router();
const amadeus = getAmadeus();
const GP_KEY = process.env.GOOGLE_PLACES_KEY || "";

/**
 * GET /api/geo/resolve?city=Delhi
 * GET /api/geo/resolve?code=DEL
 */
router.get("/resolve", async (req, res) => {
  try {
    const code = String(req.query.code || "").trim().toUpperCase();
    const city = String(req.query.city || "").trim();

    if (!code && !city) return res.status(400).json({ error: "city_or_code_required" });

    // Try Amadeus first
    try {
      const keyword = code || city;
      const r = await amadeus.referenceData.locations.get({
        keyword,
        subType: "CITY,AIRPORT",
      });
      const rows = Array.isArray(r.data) ? r.data : [];
      const best =
        rows.find((x) => x.subType === "CITY") ||
        rows.find((x) => x.subType === "AIRPORT") ||
        null;

      const lat = best?.geoCode?.latitude ?? null;
      const lon = best?.geoCode?.longitude ?? null;

      if (best && Number.isFinite(lat) && Number.isFinite(lon)) {
        return res.json({
          data: {
            source: "amadeus",
            lat,
            lon,
            name: best.name,
            code: best.iataCode || null,
            country: best.address?.countryName || best.address?.countryCode || null,
          },
        });
      }
    } catch {
      // fall through
    }

    // Fallback Google Places
    if (!GP_KEY) return res.status(503).json({ error: "google_places_not_configured" });

    const q = code ? code : city;
    const r2 = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: { query: q, type: "locality", key: GP_KEY },
        timeout: 12000,
        validateStatus: () => true,
      }
    );

    if (r2.status !== 200 || !Array.isArray(r2.data?.results) || !r2.data.results.length) {
      return res.status(404).json({ error: "city_not_found" });
    }

    const first = r2.data.results[0];
    const loc = first?.geometry?.location;
    if (!loc) return res.status(404).json({ error: "city_geometry_missing" });

    return res.json({
      data: {
        source: "google",
        lat: loc.lat,
        lon: loc.lng,
        name: first.name,
        code: code || null,
        country: null,
      },
    });
  } catch (e) {
    console.error("geo.resolve error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
