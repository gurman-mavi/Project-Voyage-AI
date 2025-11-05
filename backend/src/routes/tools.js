// backend/src/routes/tools.js
import express from "express";
import { flightSearch, hotelSearch, poiDiscover, weatherForecast } from "../agent/toolsService.js";

const router = express.Router();

router.use((req, _res, next) => {
  console.log("[tools] hit:", req.method, req.path);
  next();
});

router.get("/ping", (_req, res) => res.json({ ok: true, at: "/api/tools/ping" }));

router.post("/flight.search", async (req, res) => {
  try {
    const data = await flightSearch(req.body || {});
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

router.post("/hotel.search", async (req, res) => {
  try {
    const data = await hotelSearch(req.body || {});
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

router.post("/poi.discover", async (req, res) => {
  try {
    const data = await poiDiscover(req.body || {});
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

router.get("/weather.forecast", async (req, res) => {
  try {
    const { city, start, days } = req.query;
    const data = await weatherForecast({ city, start, days: Number(days || 7) });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

export default router;
