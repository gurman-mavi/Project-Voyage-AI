import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Env keys (optional)
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
const PEXELS_KEY = process.env.PEXELS_API_KEY || "";

// Manifest file (prebuilt by the script below)
const MANIFEST_PATH = path.join(__dirname, "..", "data", "destination-images.json");

// in-memory cache (30 days)
const mem = new Map(); // key -> { t, data }
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

// preload manifest once
let manifest = {};
async function loadManifestOnce() {
  try {
    const txt = await fs.readFile(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(txt || "{}");
  } catch {
    manifest = {};
  }
}
await loadManifestOnce();

const COUNTRY_NAMES = {
  IN:"India", AE:"United Arab Emirates", QA:"Qatar", OM:"Oman", SA:"Saudi Arabia",
  TH:"Thailand", SG:"Singapore", MY:"Malaysia", ID:"Indonesia", PH:"Philippines",
  VN:"Vietnam", HK:"Hong Kong", TW:"Taiwan", KR:"South Korea", JP:"Japan", CN:"China",
  TR:"Türkiye", FR:"France", DE:"Germany", ES:"Spain", PT:"Portugal", IT:"Italy",
  GR:"Greece", NL:"Netherlands", BE:"Belgium", CH:"Switzerland", AT:"Austria",
  CZ:"Czechia", HU:"Hungary", PL:"Poland", DK:"Denmark", SE:"Sweden", NO:"Norway",
  GB:"United Kingdom", IE:"Ireland", IS:"Iceland",
  US:"United States", CA:"Canada", MX:"Mexico",
  BR:"Brazil", AR:"Argentina", CL:"Chile", PE:"Peru", CO:"Colombia", EC:"Ecuador",
  EG:"Egypt", MA:"Morocco", ET:"Ethiopia", KE:"Kenya", TZ:"Tanzania", ZA:"South Africa",
  RW:"Rwanda", MU:"Mauritius", SC:"Seychelles",
  AU:"Australia", NZ:"New Zealand", FJ:"Fiji"
};

const keyOf = (city, country) =>
  `${String(city || "").trim().toLowerCase()}|${String(country || "").trim().toUpperCase()}`;
const ok = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const cityQ = (city, country) => [city, COUNTRY_NAMES[country] || country].filter(Boolean).join(", ");

// -------- Providers (ordered) --------
async function fromWikipedia(city) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`, {
    headers: { "User-Agent": "voyage-ai/1.0 (images@yourdomain)" }
  });
  if (!r.ok) return null;
  const j = await r.json();
  const imageUrl = j?.originalimage?.source || j?.thumbnail?.source;
  if (!ok(imageUrl)) return null;
  return {
    imageUrl,
    provider: "wikipedia",
    credit: "Image via Wikipedia",
    sourceUrl: j?.content_urls?.desktop?.page || "https://wikipedia.org"
  };
}

const tpSlug = (s) => String(s || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
async function fromTeleport(city) {
  const r = await fetch(`https://api.teleport.org/api/urban_areas/slug:${tpSlug(city)}/images/`);
  if (!r.ok) return null;
  const j = await r.json();
  const imageUrl = j?.photos?.[0]?.image?.web || j?.photos?.[0]?.image?.mobile;
  if (!ok(imageUrl)) return null;
  return {
    imageUrl,
    provider: "teleport",
    credit: "Image via Teleport",
    sourceUrl: `https://teleport.org/cities/${tpSlug(city)}/`
  };
}

async function fromPexels(city, country) {
  if (!PEXELS_KEY) return null;
  const r = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(cityQ(city, country))}&per_page=1&orientation=landscape`,
    { headers: { Authorization: PEXELS_KEY } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  const hit = j?.photos?.[0];
  const imageUrl = hit?.src?.large || hit?.src?.large2x || hit?.src?.medium;
  if (!ok(imageUrl)) return null;
  return {
    imageUrl,
    provider: "pexels",
    credit: hit?.photographer ? `Photo by ${hit.photographer} on Pexels` : "Pexels",
    sourceUrl: hit?.url || "https://pexels.com"
  };
}

async function fromUnsplash(city, country) {
  if (!UNSPLASH_KEY) return null;
  const r = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cityQ(city, country))}&per_page=1&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}`, "Accept-Version": "v1" } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  const hit = j?.results?.[0];
  const imageUrl = hit?.urls?.regular || hit?.urls?.full || hit?.urls?.small;
  if (!ok(imageUrl)) return null;
  return {
    imageUrl,
    provider: "unsplash",
    credit: hit?.user?.name ? `Photo by ${hit.user.name} on Unsplash` : "Unsplash",
    sourceUrl: hit?.links?.html || "https://unsplash.com"
  };
}

function placeholder(city) {
  return {
    imageUrl: `https://source.unsplash.com/800x600/?${encodeURIComponent(city + " skyline")}`,
    provider: "placeholder",
    credit: "Placeholder image",
    sourceUrl: ""
  };
}

// -------- Main endpoint --------
router.get("/destination", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const country = String(req.query.country || "").trim().toUpperCase();
    if (!city) return res.status(400).json({ error: "city_required" });

    const k = keyOf(city, country);

    // 1) in-memory cache
    const hit = mem.get(k);
    if (hit && (Date.now() - hit.t) < TTL_MS) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.json({ data: hit.data, via: "memory" });
    }

    // 2) manifest (prebaked)
    const pre = manifest[k];
    if (pre && ok(pre.imageUrl)) {
      mem.set(k, { t: Date.now(), data: pre });
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json({ data: pre, via: "manifest" });
    }

    // 3) provider chain (free-first)
    const providers = [
      () => fromWikipedia(city),
      () => fromTeleport(city),
      () => fromPexels(city, country),
      () => fromUnsplash(city, country)
    ];
    let out = null;
    for (const p of providers) {
      try {
        out = await p();
        if (out) break;
      } catch {}
    }
    if (!out) out = placeholder(city);

    mem.set(k, { t: Date.now(), data: out });
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json({ data: out, via: out.provider });
  } catch (e) {
    return res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

export default router;
