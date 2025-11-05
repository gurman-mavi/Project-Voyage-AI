// backend/src/routes/airports.js
import { Router } from "express";
import getAmadeus from "../lib/amadeus-sdk.js";
import { CATALOG } from "./destinations.js";

const router = Router();
const amadeus = getAmadeus();

// Build fallback list dynamically from destinations catalog
const FALLBACK = Array.from(new Map(
  (CATALOG || [])
    .filter(x => x.destinationIata)
    .map((x) => [x.destinationIata.toUpperCase(), {
      code: x.destinationIata.toUpperCase(),
      city: x.cityName,
      name: x.cityName,
      country: x.country,
    }])
).values());

const shape = (row, i = 0) => ({
  id: `${row.code}-${i}`,
  code: String(row.code || "").toUpperCase(),
  city: row.city || row.name || "",
  name: row.name || "",
  country: row.country || "",
});

async function searchHandler(req, res) {
  const term = String(req.query.term || req.query.q || "").trim();
  const limit = Math.max(1, Math.min(20, Number(req.query.limit || 10)));
  if (!term) return res.json({ ok: true, data: [] });

  try {
    const r = await amadeus.referenceData.locations.get({
      keyword: term,
      subType: "CITY,AIRPORT",
      "page[limit]": String(limit * 3),
    });

    const raw = Array.isArray(r?.data) ? r.data : [];
    const pick = new Map();

    for (const x of raw) {
      const code = (x.iataCode || "").toUpperCase();
      if (!code) continue;
      const row = {
        code,
        city: x.address?.cityName || x.name || "",
        name: x.name || "",
        country: x.address?.countryName || x.address?.countryCode || "",
        subType: x.subType,
      };
      const prev = pick.get(code);
      if (!prev || (prev.subType !== "CITY" && row.subType === "CITY")) {
        pick.set(code, row);
      }
    }

    const list = Array.from(pick.values()).slice(0, limit).map((r2, i) => shape(r2, i));
    return res.json({ ok: true, data: list, via: "amadeus" });
  } catch {
    const q = term.toLowerCase();
    const list = FALLBACK.filter(
      (a) =>
        a.code.toLowerCase().startsWith(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    )
      .slice(0, limit)
      .map((r2, i) => shape(r2, i));
    return res.json({ ok: true, data: list, via: "fallback" });
  }
}

// Routes
router.get("/search", searchHandler);
router.get("/", searchHandler);
router.get("/autocomplete", searchHandler);
router.get("/ping", (_req, res) => res.json({ ok: true, route: "/api/airports/search" }));

export default router;
