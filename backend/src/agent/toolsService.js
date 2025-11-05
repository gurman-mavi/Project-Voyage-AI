// backend/src/agent/toolsService.js
// Deterministic mock services used by /api/tools and /api/agent/plan

/* ------------------------------- Utilities ------------------------------- */
function seededRand(seedStr, min, max) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (h % 1000) / 1000; // 0..1
  return Math.round(min + r * (max - min));
}
function daysBetween(startISO, endISO) {
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO + "T00:00:00Z");
  return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)));
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function detShuffle(arr, seed) {
  return [...arr]
    .map((v, i) => ({ v, s: seededRand(`${seed}:${i}`, 0, 1000000) }))
    .sort((a, b) => a.s - b.s)
    .map(x => x.v);
}

/* -------------------------------- Flights -------------------------------- */
export async function flightSearch({
  origin, destination, departDate, returnDate = null,
  pax = { adults: 1 }, cabin = "ECONOMY", maxResults = 6
}) {
  const base = seededRand(`${origin}-${destination}-${departDate}-${returnDate}-${cabin}`, 280, 880);
  const carriers = ["AI", "QR", "TK", "EK", "BA", "LH", "KL", "SQ"];
  const out = [];
  for (let i = 0; i < Math.min(maxResults, 8); i++) {
    const price = Math.max(120, base + i * 12);
    out.push({
      id: `${origin}${destination}${departDate}-${i}`,
      price,
      currency: "USD",
      carrier: carriers[i % carriers.length],
      cabin,
      pax,
      depart: `${departDate}T0${(8 + i) % 10}:00:00`,
      arrive: `${departDate}T1${(5 + i) % 10}:30:00`,
      legs: [{ origin, destination, durationMinutes: 420 + i * 15, stops: i % 3 ? 1 : 0 }]
    });
  }
  return { results: out };
}

/* -------------------------------- Hotels --------------------------------- */
export async function hotelSearch({
  city, checkIn, checkOut, rooms = 1, guests = 2, maxResults = 8
}) {
  const nights = daysBetween(checkIn, checkOut);
  const base = seededRand(`${city}-${checkIn}-${checkOut}-${rooms}-${guests}`, 45, 180);
  const names = [
    "Grand Central", "City Garden", "Harbor View", "Riverside Inn", "Sunset Plaza",
    "Old Town Boutique", "Skyline Suites", "Parkside Hotel", "Market Street Lodge", "Cornerstone"
  ];
  const out = [];
  for (let i = 0; i < Math.min(maxResults, 10); i++) {
    const price = Math.max(30, base + i * 7);
    out.push({
      id: `${city}-${i}`,
      name: `${names[i % names.length]} ${city}`,
      price,
      currency: "USD",
      rating: 3 + (i % 3),
      nights,
      address: `${(i + 1) * 12} ${city} Central, ${city}`,
      link: `https://example.com/hotel/${encodeURIComponent(city)}/${i}`,
      coords: { lat: 0, lon: 0 },
      rooms,
      guests
    });
  }
  return { results: out };
}

/* ------------------------- Curated POI presets (keep) -------------------- */
/** Map of IATA -> [ [title, [tags]] , ... ]  (tags include Indoor/Outdoor) */
const CITY_POIS = {
  ZRH: [
    ["Bahnhofstrasse", ["Shopping","Outdoor"]],
    ["Lake Zurich Promenade", ["Culture","Outdoor"]],
    ["Uetliberg Viewpoint", ["Culture","Outdoor"]],
    ["Kunsthaus Zürich", ["Culture","Indoor"]],
    ["Old Town (Altstadt)", ["Culture","Outdoor"]],
    ["Lindenhof", ["Culture","Outdoor"]],
    ["Grossmünster", ["Culture","Indoor"]],
    ["Fraumünster", ["Culture","Indoor"]],
    ["Chocolate Tasting", ["Food","Indoor"]],
    ["Thermalbad & Spa", ["Nightlife","Indoor"]],
  ],
  DXB: [
    ["Burj Khalifa", ["Culture","Indoor"]],
    ["The Dubai Mall", ["Shopping","Indoor"]],
    ["Dubai Fountain", ["Culture","Outdoor"]],
    ["Old Dubai (Creek & Al Fahidi)", ["Culture","Outdoor"]],
    ["Jumeirah Beach", ["Beach","Outdoor"]],
    ["Palm Jumeirah Boardwalk", ["Beach","Outdoor"]],
    ["Dubai Frame", ["Culture","Indoor"]],
    ["Global Village", ["Culture","Outdoor"]],
    ["Miracle Garden", ["Culture","Outdoor"]],
    ["Gold & Spice Souks", ["Shopping","Outdoor"]],
  ],
  IST: [
    ["Hagia Sophia", ["Culture","Indoor"]],
    ["Blue Mosque", ["Culture","Indoor"]],
    ["Topkapi Palace", ["Culture","Indoor"]],
    ["Grand Bazaar", ["Shopping","Indoor"]],
    ["Spice Bazaar", ["Food","Indoor"]],
    ["Galata Tower", ["Culture","Indoor"]],
    ["Istiklal Street", ["Shopping","Nightlife","Outdoor"]],
    ["Bosphorus Cruise", ["Culture","Outdoor"]],
    ["Dolmabahçe Palace", ["Culture","Indoor"]],
  ],
  SIN: [
    ["Marina Bay Sands", ["Culture","Indoor"]],
    ["Gardens by the Bay", ["Culture","Outdoor"]],
    ["Chinatown", ["Culture","Food","Outdoor"]],
    ["Little India", ["Culture","Food","Outdoor"]],
    ["Sentosa Island", ["Beach","Outdoor"]],
    ["Hawker Centre Crawl", ["Food","Indoor"]],
    ["Haji Lane", ["Shopping","Nightlife","Outdoor"]],
    ["Botanic Gardens", ["Culture","Outdoor"]],
    ["Clarke Quay", ["Nightlife","Outdoor"]],
  ],
  BKK: [
    ["Grand Palace", ["Culture","Outdoor"]],
    ["Wat Arun", ["Culture","Outdoor"]],
    ["Wat Pho", ["Culture","Indoor"]],
    ["Chatuchak Market", ["Shopping","Outdoor"]],
    ["Chao Phraya Ferry", ["Culture","Outdoor"]],
    ["ICONSIAM", ["Shopping","Indoor"]],
    ["Asiatique Night Market", ["Nightlife","Shopping","Outdoor"]],
    ["Khao San Road", ["Nightlife","Outdoor"]],
  ],
  DEL: [
    ["Red Fort", ["Culture","Outdoor"]],
    ["Qutub Minar", ["Culture","Outdoor"]],
    ["Humayun’s Tomb", ["Culture","Outdoor"]],
    ["India Gate & Rajpath", ["Culture","Outdoor"]],
    ["Chandni Chowk Food Walk", ["Food","Shopping","Outdoor"]],
    ["Lotus Temple", ["Culture","Indoor"]],
    ["Hauz Khas", ["Nightlife","Culture","Outdoor"]],
    ["Dilli Haat", ["Shopping","Food","Outdoor"]],
  ],
  BOM: [
    ["Gateway of India", ["Culture","Outdoor"]],
    ["Colaba Causeway", ["Shopping","Food","Outdoor"]],
    ["Marine Drive", ["Culture","Outdoor"]],
    ["Sanjay Gandhi National Park", ["Culture","Outdoor"]],
    ["Bandra Fort & Sea Link", ["Culture","Outdoor"]],
    ["Juhu Beach", ["Beach","Outdoor"]],
    ["Kala Ghoda", ["Culture","Outdoor"]],
  ],
  GOI: [
    ["Baga Beach", ["Beach","Outdoor"]],
    ["Calangute Beach", ["Beach","Outdoor"]],
    ["Fort Aguada", ["Culture","Outdoor"]],
    ["Old Goa Churches", ["Culture","Indoor"]],
    ["Candolim Beach", ["Beach","Outdoor"]],
    ["Anjuna Flea Market", ["Shopping","Outdoor"]],
    ["Palolem Beach", ["Beach","Outdoor"]],
  ],
  CDG: [
    ["Eiffel Tower", ["Culture","Outdoor"]],
    ["Louvre Museum", ["Culture","Indoor"]],
    ["Seine Cruise", ["Culture","Outdoor"]],
    ["Montmartre", ["Culture","Outdoor"]],
    ["Le Marais", ["Shopping","Food","Outdoor"]],
    ["Luxembourg Gardens", ["Culture","Outdoor"]],
  ],
  LHR: [
    ["British Museum", ["Culture","Indoor"]],
    ["Tower of London", ["Culture","Indoor"]],
    ["Buckingham Palace", ["Culture","Outdoor"]],
    ["Borough Market", ["Food","Outdoor"]],
    ["Camden Market", ["Shopping","Outdoor"]],
    ["Hyde Park", ["Culture","Outdoor"]],
    ["Soho", ["Nightlife","Outdoor"]],
  ],
  JFK: [
    ["Central Park", ["Culture","Outdoor"]],
    ["Met Museum", ["Culture","Indoor"]],
    ["Brooklyn Bridge", ["Culture","Outdoor"]],
    ["Times Square", ["Nightlife","Outdoor"]],
    ["High Line", ["Culture","Outdoor"]],
    ["Chelsea Market", ["Food","Shopping","Indoor"]],
  ],
};

/* ---------------------------- Template banks ----------------------------- */
// [title, tags] — titles will be localized per city for non-curated places
const TEMPLATES = {
  beach: [
    ["Sunset Beach Walk", ["Beach","Outdoor"]],
    ["Waterfront Promenade", ["Culture","Outdoor"]],
    ["Seafood Night Market", ["Food","Outdoor"]],
    ["Beach Club", ["Nightlife","Outdoor"]],
    ["Lighthouse Lookout", ["Culture","Outdoor"]],
  ],
  historic: [
    ["Old Town Walk", ["Culture","Outdoor"]],
    ["City Museum", ["Culture","Indoor"]],
    ["Fortress & Ramparts", ["Culture","Outdoor"]],
    ["Cathedral Visit", ["Culture","Indoor"]],
    ["Local Crafts Bazaar", ["Shopping","Indoor"]],
  ],
  foodie: [
    ["Street Food Crawl", ["Food","Outdoor"]],
    ["Farmers Market", ["Food","Outdoor"]],
    ["Cooking Class", ["Food","Indoor"]],
    ["Cafe Hopping", ["Food","Indoor"]],
    ["Rooftop Dinner", ["Food","Nightlife","Outdoor"]],
  ],
  shopping: [
    ["Main Bazaar", ["Shopping","Outdoor"]],
    ["Designer District", ["Shopping","Indoor"]],
    ["Outlet Village", ["Shopping","Outdoor"]],
    ["Antique Arcade", ["Shopping","Indoor"]],
  ],
  nature: [
    ["Botanical Garden", ["Culture","Outdoor"]],
    ["City Park Loop", ["Culture","Outdoor"]],
    ["Scenic Viewpoint", ["Culture","Outdoor"]],
    ["Riverfront Trail", ["Culture","Outdoor"]],
    ["Lake Boat Ride", ["Culture","Outdoor"]],
  ],
  nightlife: [
    ["Craft Beer Lane", ["Nightlife","Outdoor"]],
    ["Jazz Bar", ["Nightlife","Indoor"]],
    ["Skyline Rooftop", ["Nightlife","Outdoor"]],
    ["Night Market", ["Nightlife","Shopping","Outdoor"]],
  ],
};

// Some codes bias to beachy profiles
const BEACH_HINTS = new Set([
  "DPS","HKT","GOI","CMB","MLE","ZNZ","CPT","BCN","LIS","NCE","MIA","LAX","SFO","GIG","HNL","BNE","SYD","AKL","SEZ","MRU","NAN"
]);

/* ------------------------- Weather (deterministic) ------------------------ */
function fakeWeatherForRange(cityKey, startISO, endISO) {
  const days = daysBetween(startISO, endISO);
  const labels = ["Sunny", "Mild", "Showers", "Partly Cloudy", "Cool & Clear"];
  const out = [];
  for (let i = 0; i < days; i++) {
    const seed = `${cityKey}:${addDays(startISO, i)}`;
    const hi = seededRand(seed, 12, 34);
    const lo = Math.max(0, hi - seededRand(seed + ":lo", 4, 12));
    const p = seededRand(seed + ":p", 0, 80);
    const summary = labels[seededRand(seed + ":s", 0, labels.length - 1)];
    out.push({ date: addDays(startISO, i), summary, hi, lo, precipitation: p });
  }
  return out;
}

/* -------------------- Localize template titles per city ------------------- */
function localizeTitle(baseTitle, cityLabel, seedKey, idx) {
  // Three variants so cities don’t look the same in text lists
  const variants = [
    `${baseTitle} — ${cityLabel}`,
    `${cityLabel} ${baseTitle}`,
    `${baseTitle} in ${cityLabel}`,
  ];
  const pick = variants[seededRand(`${seedKey}:${baseTitle}:${idx}`, 0, variants.length - 1)];
  return pick;
}

/* -------------- Pick a unique template mix for ANY city token ------------- */
function autoProfileForCity(key) {
  const preferBeach = BEACH_HINTS.has(key);
  const pool = ["historic","foodie","shopping","nature","nightlife","beach"];
  const shuffled = detShuffle(pool, `profile:${key}`);
  const want = preferBeach ? 4 : 3;
  const chosen = [];
  for (const t of shuffled) {
    if (!chosen.includes(t)) chosen.push(t);
    if (chosen.length >= want) break;
  }
  return chosen;
}

/* --------------------- Build a city-specific daily plan ------------------- */
export function buildDailyPlan({ cityToken, start, end, userInterests = [] }) {
  const key = String(cityToken || "").toUpperCase();
  const cityLabel = key; // If you later resolve proper city names, set them here.

  // curated + localized templates
  const curated = (CITY_POIS[key] || []).map(([title, tags]) => ({ title, tags }));

  const profile = autoProfileForCity(key);
  const templated = profile.flatMap((p) => {
    const bank = TEMPLATES[p] || [];
    return bank.map(([t, tags], i) => ({
      title: localizeTitle(t, cityLabel, `tmpl:${key}:${p}`, i),
      tags
    }));
  });

  // merge unique by title
  const poolMap = new Map();
  [...curated, ...templated].forEach(p => { if (!poolMap.has(p.title)) poolMap.set(p.title, p); });
  if (poolMap.size === 0) {
    // ultimate fallback with localization
    ["historic","foodie","shopping","nature","beach","nightlife"].forEach((tp) => {
      (TEMPLATES[tp] || []).forEach(([t, tags], i) => {
        const title = localizeTitle(t, cityLabel, `fb:${key}:${tp}`, i);
        poolMap.set(title, { title, tags });
      });
    });
  }
  const pool = Array.from(poolMap.values());

  const interestSet = new Set((userInterests || []).map(s => s.toLowerCase()));
  const days = daysBetween(start, end);
  const wx = fakeWeatherForRange(key, start, end);

  const used = new Set();
  const result = [];

  for (let d = 0; d < days; d++) {
    const weather = wx[d];
    const wet = weather.precipitation >= 50 || /showers/i.test(weather.summary);
    const dow = new Date(weather.date + "T00:00:00Z").getUTCDay(); // 0 Sun .. 6 Sat
    const weekend = (dow === 5 || dow === 6);

    const slots = [
      { label: "morning", time: "09:30" },
      { label: "afternoon", time: "13:30" },
      { label: "evening", time: "18:30" },
    ];

    const picks = [];

    for (const slot of slots) {
      const ranked = pool.map(p => {
        let s = 0;
        // interests
        if (p.tags.some(t => interestSet.has(t.toLowerCase()))) s += 30;
        // weather
        if (wet && p.tags.includes("Indoor")) s += 10;
        if (!wet && p.tags.includes("Outdoor")) s += 6;
        // time of day
        if (slot.label === "morning") {
          if (p.tags.includes("Culture") || p.tags.includes("Nature") || p.tags.includes("Outdoor")) s += 6;
        } else if (slot.label === "afternoon") {
          if (["Culture","Shopping","Beach","Food","Nature"].some(t => p.tags.includes(t))) s += 6;
        } else if (slot.label === "evening") {
          if (p.tags.includes("Food")) s += 6;
          if (p.tags.includes("Nightlife")) s += weekend ? 14 : 8;
          if (wet && p.tags.includes("Indoor")) s += 6;
        }
        // deterministic noise
        s += seededRand(`${key}:${weather.date}:${slot.label}:${p.title}`, 0, 20);
        // de-prioritize repeats
        if (used.has(p.title)) s -= 50;
        return { p, s };
      }).sort((a, b) => b.s - a.s).map(x => x.p);

      const pick = ranked.find(p => !used.has(p.title)) || ranked[0];
      used.add(pick.title);
      picks.push({
        time: slot.time,
        title: pick.title,
        notes: pick.tags.length ? `(${pick.tags.join(", ")})` : ""
      });
    }

    result.push({
      date: weather.date,
      weather: { summary: weather.summary, lo: weather.lo, hi: weather.hi, precipitation: weather.precipitation },
      blocks: picks
    });
  }

  return result;
}

/* --------------------- Compatibility helper exports ---------------------- */
export async function poiDiscover({ cityToken = "", lat = 0, lon = 0, limit = 20 }) {
  const key = String(cityToken || "").toUpperCase();
  const cityLabel = key;

  // If curated exists, use it. Otherwise use localized templates.
  const curated = CITY_POIS[key] || [];
  const baseLat = Number(lat) || 0;
  const baseLon = Number(lon) || 0;

  let items = curated.map(([title, tags], i) => ({
    name: title,
    tags,
    lat: baseLat + (i % 5) * 0.001,
    lon: baseLon + (i % 7) * 0.001
  }));

  if (items.length === 0) {
    const prof = autoProfileForCity(key);
    const templated = prof.flatMap((p) => {
      const bank = TEMPLATES[p] || [];
      return bank.map(([t, tags], i) => ({
        name: localizeTitle(t, cityLabel, `poi:${key}:${p}`, i),
        tags,
      }));
    });
    items = templated.slice(0, limit).map((row, i) => ({
      ...row,
      lat: baseLat + i * 0.001,
      lon: baseLon + i * 0.001
    }));
  }

  return { results: items.slice(0, Math.max(1, Math.min(limit, items.length))) };
}

export async function weatherForecast({ city = "GEN", start, end }) {
  const key = String(city || "GEN").toUpperCase();
  const results = fakeWeatherForRange(key, start, end);
  return { results };
}

/* -------------------------------- Default -------------------------------- */
export default {
  flightSearch,
  hotelSearch,
  buildDailyPlan,
  poiDiscover,
  weatherForecast,
};
