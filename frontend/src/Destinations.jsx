import { useEffect, useMemo, useRef, useState } from "react";
import ConciergePanel from "./components/ConciergePanel.jsx";
import WorldMapModal from "./components/WorldMapModal.jsx";

/**
 * Destinations (flight-free)
 * - Fetches a large static catalog from /api/destinations/catalog
 * - Search by city or IATA code
 * - Filter by continent; optional "Group by continent"
 * - Destination cards fetch images from /api/images/destination
 * - Lazy-loaded images, client cache, resilient fallbacks, credit overlay
 */

/* ================================= Constants ================================ */

const CONTINENTS = ["All", "Asia", "Europe", "North America", "South America", "Africa", "Oceania", "Other"];

/* ============================== In-view Hook ================================ */

/** Returns true when the element is near/inside the viewport (for lazy-loading). */
function useInView(ref, rootMargin = "200px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { root: null, rootMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/* ============================== Client Cache ================================ */

/** In-memory cache to avoid refetching the same city multiple times on the client. */
const imageCache = new Map(); // key: "city|country" -> { imageUrl, credit, sourceUrl }
function cacheKey(city, country) {
  return `${String(city || "").toLowerCase()}|${String(country || "").toUpperCase()}`;
}

/* ======================== Tiny concurrency gate ============================ */

let inflight = 0;
const MAX_CONCURRENCY = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gatedFetch(url, opts) {
  while (inflight >= MAX_CONCURRENCY) {
    await sleep(50);
  }
  inflight++;
  try {
    return await fetch(url, opts);
  } finally {
    inflight--;
  }
}

/* ================================== Page =================================== */

export default function Destinations() {
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState("All");
  const [groupByContinent, setGroupByContinent] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [concierge, setConcierge] = useState(null); // {city,country,iata,mode}

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Build endpoint to the catalog (no flights)
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("limit", "800"); // bump this if you expand catalog
    return `/api/destinations/catalog?${params.toString()}`;
  }, [query]);

  // Fetch catalog
  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr("");
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!live) return;
        setItems(Array.isArray(j.data) ? j.data : []);
      })
      .catch((e) => live && setErr(e.message || "Failed to load"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [endpoint]);

  // Continent filter
  const filtered = useMemo(() => {
    if (continent === "All") return items;
    return items.filter((d) => d.region === continent);
  }, [items, continent]);

  // Grouping for sectioned layout
  const groups = useMemo(() => {
    const order = CONTINENTS.filter((c) => c !== "All");
    const m = new Map(order.map((k) => [k, []]));
    for (const d of filtered) {
      const key = order.includes(d.region) ? d.region : "Other";
      m.get(key).push(d);
    }
    return { order, map: m };
  }, [filtered]);

  const countShown = groupByContinent
    ? Array.from(groups.map.values()).reduce((acc, arr) => acc + arr.length, 0)
    : filtered.length;

  return (
    <div className="text-slate-900">
      {/* Controls header */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-3 md:items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Search a city or IATA code</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Goa, DXB, Paris…"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="mt-1 text-[11px] text-slate-500">Tip: try city names or airport codes.</p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white h-10">
                <input
                  type="checkbox"
                  checked={groupByContinent}
                  onChange={(e) => setGroupByContinent(e.target.checked)}
                />
                Group by continent
              </label>
              <button onClick={()=>setMapOpen(true)} className="h-10 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm">World map</button>
            </div>
          </div>

          {/* Continent filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CONTINENTS.map((c) => (
              <button
                key={c}
                onClick={() => setContinent(c)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  continent === c
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-2 text-xs text-slate-500">
            Showing <b>{countShown}</b> of <b>{filtered.length}</b> destinations
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && <SkeletonGrid />}

        {!loading && err && (
          <div className="text-center text-slate-600 py-12">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">We hit a snag</h3>
            <p className="text-red-600">{err}</p>
          </div>
        )}

        {!loading && !err && filtered.length === 0 && (
          <div className="text-center text-slate-600 py-12">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No matches</h3>
            <p>Try another city or code.</p>
          </div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <>
            {groupByContinent ? (
              groups.order.map((ctn) => {
                const list = groups.map.get(ctn) || [];
                if (!list.length) return null;
                return (
                  <section key={ctn} className="mb-10">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xl font-bold">{ctn}</h2>
                      <span className="text-xs text-slate-500">{list.length} places</span>
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {list.map((d) => (
                        <DestinationCard key={`${ctn}-${d.destinationIata || d.cityName}`} data={d} onAskAI={(info)=>setConcierge({...info, mode: 'chat'})} onExplore={(info)=>setConcierge({...info, mode: 'map'})} />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((d) => (
                  <DestinationCard key={d.destinationIata || d.cityName} data={d} onAskAI={(info)=>setConcierge({...info, mode: 'chat'})} onExplore={(info)=>setConcierge({...info, mode: 'map'})} />
                ))}
              </div>
            )}
          </>
        )}

        <p className="mt-6 text-xs text-slate-500">
          *This page uses a curated catalog and intentionally excludes flight pricing/availability.
        </p>
      </main>
      {mapOpen && (
        <WorldMapModal
          items={filtered}
          onClose={()=>setMapOpen(false)}
          onSelect={(d)=> setConcierge({ city: d.cityName, country: d.country, iata: d.destinationIata, mode: 'chat' })}
        />
      )}

      {concierge && (
        <ConciergePanel
          city={concierge.city}
          country={concierge.country}
          iata={concierge.iata || ""}
          mode={concierge.mode || "chat"}
          onClose={() => setConcierge(null)}
        />
      )}
    </div>
  );
}

/* ========================= Destination Card ========================= */

function DestinationCard({ data, onAskAI, onExplore }) {
  const city = data.cityName || "—";
  const country = data.country || "";
  const iata = data.destinationIata || null;

  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, "250px");

  const [img, setImg] = useState(null);
  const [credit, setCredit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loadingImg, setLoadingImg] = useState(false);
  const [openConcierge, setOpenConcierge] = useState(false);

  // Resilient fallback if the loaded image 404s later
  const handleImgError = () => setImg(imageFallback(city));

  // Try cache first, otherwise fetch when in view
  useEffect(() => {
    let alive = true;
    const key = cacheKey(city, country);

    async function load() {
      if (imageCache.has(key)) {
        const c = imageCache.get(key);
        setImg(c.imageUrl);
        setCredit(c.credit || "");
        setSourceUrl(c.sourceUrl || "");
        return;
      }
      if (!inView) return; // don’t fetch until visible

      setLoadingImg(true);
      try {
        const r = await gatedFetch(
          `/api/images/destination?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
        );
        const j = await r.json();
        const imageUrl = j?.data?.imageUrl || imageFallback(city);
        const credit = j?.data?.credit || "";
        const sourceUrl = j?.data?.sourceUrl || "";
        if (!alive) return;
        imageCache.set(key, { imageUrl, credit, sourceUrl });
        setImg(imageUrl);
        setCredit(credit);
        setSourceUrl(sourceUrl);
      } catch {
        if (!alive) return;
        const fallback = imageFallback(city);
        imageCache.set(key, { imageUrl: fallback, credit: "", sourceUrl: "" });
        setImg(fallback);
        setCredit("");
        setSourceUrl("");
      } finally {
        if (alive) setLoadingImg(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [city, country, inView]);

  return (
    <article
      ref={wrapRef}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col"
    >
      <div className="relative aspect-video bg-slate-100">
        <img
          src={img || imageFallback(city)}
          alt={city}
          loading="lazy"
          decoding="async"
          onError={handleImgError}
          className={`w-full h-full object-cover ${loadingImg ? "opacity-70" : "opacity-100"}`}
        />
        {!!credit && (
          <a
            href={sourceUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 bottom-2 text-[10px] text-white/90 bg-black/45 hover:bg-black/60 px-2 py-0.5 rounded"
            title={credit}
          >
            {credit}
          </a>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold">{city}</h3>
        <p className="text-sm text-slate-500">
          {flag(country)} {country}
        </p>

        <div className="mt-auto pt-3">
          <button
            onClick={() => { if (onExplore) onExplore({ city, country, iata }); else setOpenConcierge(true); }}
            aria-label={`Explore ${city}`}
            className="block w-full text-center font-semibold rounded-xl border border-indigo-200 bg-gradient-to-b from-white to-indigo-50 hover:border-indigo-400 text-indigo-800 px-3 py-2 transition"
          >
            🗺️ Explore
          </button>
          <button
            onClick={() => {
              if (onAskAI) onAskAI({ city, country, iata }); else setOpenConcierge(true);
            }}
            className="mt-2 block w-full text-center font-semibold rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 px-3 py-2 transition"
          >
            💬 Ask AI
          </button>
        </div>
      </div>
      {openConcierge && (
        <ConciergePanel
          city={city}
          country={country}
          iata={iata || ""}
          onClose={() => setOpenConcierge(false)}
        />
      )}
    </article>
  );
}

/* ========================= Skeleton / Utils ========================= */

function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="aspect-video bg-slate-200 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-1/2 bg-slate-200 animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-slate-200 animate-pulse rounded" />
            <div className="h-8 w-full bg-slate-200 animate-pulse rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function imageFallback(city) {
  // Only used if all providers fail *or* before an image loads.
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(city + " skyline")}`;
}

function flag(countryCode) {
  const cc = String(countryCode || "").toUpperCase();
  if (cc.length !== 2) return "";
  // Regional Indicator Symbols trick
  return cc.replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}
