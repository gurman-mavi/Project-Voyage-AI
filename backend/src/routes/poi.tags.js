// backend/src/routes/poi.tags.js
import express from "express";
import axios from "axios";

const router = express.Router();
const GP_KEY = process.env.GOOGLE_PLACES_KEY || "";

if (!GP_KEY) {
  console.warn("[poi.tags] GOOGLE_PLACES_KEY is missing; /api/poi/tags will return 503");
}

// helper to call Nearby Search
async function nearby({ lat, lon, radius, type, keyword }) {
  if (!GP_KEY) throw new Error("no_google_key");
  const params = {
    key: GP_KEY,
    location: `${lat},${lon}`,
    radius: String(radius),
  };
  if (type) params.type = type;          // e.g., "tourist_attraction", "museum", "night_club"
  if (keyword) params.keyword = keyword; // e.g., "beach"

  const r = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    params,
    timeout: 12000,
    validateStatus: () => true,
  });

  // tolerate OVER_QUERY_LIMIT / ZERO_RESULTS gracefully
  if (r.status !== 200) return { results: [], status: "UPSTREAM_ERROR", raw: r.data };
  if (r.data?.status !== "OK" && r.data?.status !== "ZERO_RESULTS") {
    return { results: [], status: r.data?.status || "UNKNOWN" };
  }
  return {
    results: Array.isArray(r.data?.results) ? r.data.results : [],
    status: r.data?.status || "OK"
  };
}

// map results to a compact list (name + rating) for UI chips/tooltips
function summarize(list, take = 5) {
  return list.slice(0, take).map(p => ({
    name: p.name,
    rating: p.rating || null
  }));
}

// GET /api/poi/tags?lat=28.61&lon=77.23&radius=8000
router.get("/tags", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const radius = Math.max(1000, Math.min(30000, Number(req.query.radius || 8000)));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat_and_lon_required" });
    }
    if (!GP_KEY) return res.status(503).json({ error: "google_places_not_configured" });

    // Parallel category probes
    const [
      sights,        // generic culture/sights
      museums,       // culture
      nightlife,     // nightlife
      restaurants,   // food
      shopping,      // shopping
      beaches        // beach via keyword (no dedicated 'beach' type)
    ] = await Promise.all([
      nearby({ lat, lon, radius, type: "tourist_attraction" }),
      nearby({ lat, lon, radius, type: "museum" }),
      nearby({ lat, lon, radius, type: "night_club" }),
      nearby({ lat, lon, radius, type: "restaurant" }),
      nearby({ lat, lon, radius, type: "shopping_mall" }),
      nearby({ lat, lon, radius, keyword: "beach" }),
    ]);

    // Tag thresholds (tweak as you like)
    const tags = {
      Culture: (sights.results.length + museums.results.length) >= 10,
      Nightlife: nightlife.results.length >= 5,
      Food: restaurants.results.length >= 15,
      Shopping: shopping.results.length >= 5,
      Beach: beaches.results.length >= 2, // more lenient
    };

    // Provide examples for tooltips or future detail pages
    const examples = {
      Culture: summarize([...sights.results, ...museums.results]),
      Nightlife: summarize(nightlife.results),
      Food: summarize(restaurants.results),
      Shopping: summarize(shopping.results),
      Beach: summarize(beaches.results),
    };

    return res.json({
      data: {
        counts: {
          Culture: sights.results.length + museums.results.length,
          Nightlife: nightlife.results.length,
          Food: restaurants.results.length,
          Shopping: shopping.results.length,
          Beach: beaches.results.length,
        },
        tags,
        examples
      }
    });
  } catch (e) {
    console.error("poi.tags error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
