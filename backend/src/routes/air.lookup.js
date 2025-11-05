// backend/src/routes/air.lookup.js
import { Router } from "express";
import getAmadeus from "../lib/amadeus-sdk.js";

const router = Router();
const amadeus = getAmadeus();

/**
 * GET /api/air/lookup?keyword=DEL&subType=CITY,AIRPORT&limit=8
 */
router.get("/lookup", async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const subType = req.query.subType || "CITY,AIRPORT";
    const limit = Number(req.query.limit || 8);

    if (!keyword) return res.json({ data: [] });

    const r = await amadeus.referenceData.locations.get({ keyword, subType });
    const raw = Array.isArray(r.data) ? r.data : [];

    const data = raw.slice(0, limit).map((x) => ({
      id: `${x.subType}:${x.iataCode}`,
      type: x.subType,
      code: x.iataCode,
      name: x.name,
      detailedName: x.detailedName || x.name,
      cityName: x.address?.cityName || x.name,
      countryCode: x.address?.countryCode,
      geo: x.geo || null,
    }));

    res.json({ data });
  } catch (e) {
    console.error("Air lookup error:", e.message);
    res.status(500).json({ error: e?.response?.result || e.message });
  }
});

/**
 * GET /api/air/nearby?lat=28.61&lon=77.23&limit=5
 */
router.get("/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const limit = Math.max(1, Math.min(10, Number(req.query.limit || 5)));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat_and_lon_required" });
    }

    const r = await amadeus.referenceData.locations.airports.get({
      latitude: lat,
      longitude: lon,
    });

    const raw = Array.isArray(r.data) ? r.data : [];
    const data = raw
      .map((x) => ({
        code: x.iataCode,
        name: x.name,
        city: x.address?.cityName || "",
        countryCode: x.address?.countryCode || "",
        distance: x.distance?.value ?? null,
        geo: x.geoCode || null,
      }))
      .filter((x) => x.code)
      .slice(0, limit);

    res.json({ data });
  } catch (e) {
    console.error("Air nearby error:", e.message);
    res.status(500).json({ error: e?.response?.result || e.message });
  }
});

export default router;
