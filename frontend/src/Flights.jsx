// src/Flights.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTripCart } from "./contexts/TripCartContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "./contexts/NotificationContext.jsx";

/* =========================
   Feature flags / constants
   ========================= */
const STRIP_PRICE_PROBES = true;   // show cheapest price per nearby day (extra requests)
const STRIP_SPAN = 3;              // ± days around selected date
const STRIP_LIMIT_PER_DAY = 6;     // backend limit per probe day

const SUGGEST_DEBOUNCE_MS = 200;
const SUGGEST_MIN_CHARS = 1;
const LIVE_PEEK_LIMIT = 6;

const DURATION_MAX_MIN = Math.round(30.5 * 60); // minutes

// Currency strategy: always fetch backend in INR, then convert for display
const BACKEND_BASE_CCY = "INR";                      // <-- important
const SUPPORTED_CCYS = ["INR", "USD", "EUR", "GBP"]; // expand if you like

// Safe fallback rates (approx). These are only used if your FX endpoint is unavailable.
// Values are "1 INR = X <CCY>" (e.g., 1 INR ≈ 0.012 USD).
const DEFAULT_FX_FROM_INR = {
  INR: 1,
  USD: 0.012, // ~ ₹84 → $1
  EUR: 0.011, // ~ ₹90 → €1
  GBP: 0.0095 // ~ ₹105 → £1
};

// Simple retry helper for flaky network or backend cold start
async function fetchWithRetry(url, opts = {}, attempts = 3, baseDelayMs = 300) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok) return r;
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    // exponential backoff with jitter
    const jitter = Math.random() * 100;
    await new Promise(res => setTimeout(res, baseDelayMs * (i + 1) + jitter));
  }
  throw lastErr || new Error('network_failed');
}

/* =========================
   Utilities
   ========================= */
function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}
const toISO = (d) => (d?.length === 10 ? d : new Date().toISOString().slice(0, 10));

function qp(qs, names, fallback = "") {
  // return the first non-empty value among several query param names
  for (const n of names) {
    const v = qs.get(n);
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return fallback;
}

function addDays(dateStr, d) {
  const d0 = new Date(dateStr + "T00:00:00");
  d0.setDate(d0.getDate() + d);
  const y = d0.getFullYear();
  const m = String(d0.getMonth() + 1).padStart(2, "0");
  const dd = String(d0.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
const fmtDay = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" });

function minutesToHM(mins) {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
function priceFmt(currency, amount, approx = false) {
  const c = (currency || "").toUpperCase();
  const sym = ({ INR: "₹", USD: "$", EUR: "€", GBP: "£" }[c]) ?? "";
  const prefix = sym || (c ? c + " " : "");
  const rounded = Math.round(Number(amount || 0)); // show whole units for all
  return `${approx ? "≈ " : ""}${prefix}${Number(rounded).toLocaleString()}`;
}
const isIata = (s) => /^[A-Za-z]{3}$/.test(String(s || "").trim());
const upIata = (s) => String(s || "").trim().slice(0, 3).toUpperCase();

/* =========================
   Airport fallback list (for autocomplete)
   ========================= */
const FALLBACK_AIRPORTS = [
  { code:"DEL", city:"Delhi", name:"Indira Gandhi International", country:"India" },
  { code:"BOM", city:"Mumbai", name:"Chhatrapati Shivaji Intl", country:"India" },
  { code:"BLR", city:"Bengaluru", name:"Kempegowda Intl", country:"India" },
  { code:"GOI", city:"Goa", name:"Dabolim / Mopa", country:"India" },
  { code:"HYD", city:"Hyderabad", name:"Rajiv Gandhi Intl", country:"India" },
  { code:"MAA", city:"Chennai", name:"Chennai Intl", country:"India" },
  { code:"CCU", city:"Kolkata", name:"Netaji Subhash Chandra Bose", country:"India" },
  { code:"LHR", city:"London", name:"Heathrow", country:"United Kingdom" },
  { code:"LGW", city:"London", name:"Gatwick", country:"United Kingdom" },
  { code:"MUC", city:"Munich", name:"Munich Intl", country:"Germany" },
  { code:"FRA", city:"Frankfurt", name:"Frankfurt Main", country:"Germany" },
  { code:"CDG", city:"Paris", name:"Charles de Gaulle", country:"France" },
  { code:"AMS", city:"Amsterdam", name:"Schiphol", country:"Netherlands" },
  { code:"DXB", city:"Dubai", name:"Dubai Intl", country:"U.A.E." },
  { code:"DOH", city:"Doha", name:"Hamad Intl", country:"Qatar" },
  { code:"SIN", city:"Singapore", name:"Changi", country:"Singapore" },
  { code:"JFK", city:"New York", name:"John F. Kennedy Intl", country:"USA" },
  { code:"SFO", city:"San Francisco", name:"San Francisco Intl", country:"USA" },
  { code:"LAX", city:"Los Angeles", name:"Los Angeles Intl", country:"USA" },
];

/* =========================
   FX helpers
   ========================= */
async function fetchFxFromApi() {
  const candidates = [
    "/api/fx/latest?base=INR",
    "/api/rates?base=INR",
    "/api/currency/rates?base=INR",
    "/api/exchange/latest?base=INR",
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      const base = (j?.base || "INR").toUpperCase();
      const map = j?.rates || {};
      if (base !== "INR") continue; // we only handle INR base in this client
      if (!map || !Object.keys(map).length) continue;
      const out = {
        ...DEFAULT_FX_FROM_INR,
        ...Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toUpperCase(), Number(v)])),
      };
      out.INR = 1;
      return out;
    } catch { /* try next */ }
  }
  return null;
}

function makeFxConverter(ratesFromINR) {
  const R = { ...DEFAULT_FX_FROM_INR, ...(ratesFromINR || {}) };
  // Convert amount from->to using INR as bridge.
  return function convert(amount, from, to) {
    const F = (from || "INR").toUpperCase();
    const T = (to || "INR").toUpperCase();
    if (!SUPPORTED_CCYS.includes(F) || !SUPPORTED_CCYS.includes(T)) return Number(amount || 0);
    if (F === T) return Number(amount || 0);

    let inINR;
    if (F === "INR") inINR = Number(amount || 0);
    else {
      const rF = R[F] || 0; // INR->F
      if (!rF) return Number(amount || 0);
      inINR = Number(amount || 0) / rF; // F -> INR
    }
    if (T === "INR") return inINR;
    const rT = R[T] || 0; // INR->T
    if (!rT) return Number(amount || 0);
    return inINR * rT;    // INR -> T
  };
}

/* =========================
   Pick a clock time if present
   ========================= */
function pickTime(item, timeKey, dateKey) {
  const t = item?.[timeKey];
  if (t && /^\d{2}:\d{2}/.test(String(t))) return String(t).slice(0, 5);
  const d = item?.[dateKey];
  if (d && typeof d === "string" && d.includes("T")) return d.slice(11, 16);
  return null;
}

/* =========================
   Normalization helpers
   ========================= */
function parseISODurToMin(s) {
  if (!s || typeof s !== "string") return null;
  const h = /(\d+)H/.exec(s)?.[1];
  const m = /(\d+)M/.exec(s)?.[1];
  return (h ? Number(h) * 60 : 0) + (m ? Number(m) : 0);
}

/** Accepts Amadeus-like flight-offers or your old shape and returns cards */
function normalizeFromBackend(json) {
  const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  if (!Array.isArray(list)) return [];

  // Already normalized?
  if (list.length && (list[0].depart_time || list[0].depart_date)) return list;

  const out = [];
  for (const fo of list) {
    const priceObj = fo?.price || {};
    const priceNum = Number(priceObj?.grandTotal ?? priceObj?.total ?? fo?.price) || 0;
    const currency = BACKEND_BASE_CCY;

    const itin = fo?.itineraries?.[0] || {};
    const segs = Array.isArray(itin?.segments) ? itin.segments : [];
    if (!segs.length) continue;

    const seg0 = segs[0];
    const lastSeg = segs[segs.length - 1];

    const depAt = seg0?.departure?.at || null;
    const arrAt = lastSeg?.arrival?.at || null;

    const depart_date = depAt || null;
    const arrive_date = arrAt || null;
    const depart_time = depAt ? depAt.slice(11, 16) : null;
    const arrive_time = arrAt ? arrAt.slice(11, 16) : null;

    const from_iata = seg0?.departure?.iataCode || fo?.originLocationCode || null;
    const to_iata = lastSeg?.arrival?.iataCode || fo?.destinationLocationCode || null;

    const transfers = Math.max(0, (segs?.length || 1) - 1);
    const airline = seg0?.carrierCode || fo?.validatingAirlineCodes?.[0] || (segs[0]?.carrier || "XX");
    const gate = seg0?.number || "";

    let duration_minutes = parseISODurToMin(itin?.duration);
    if (duration_minutes == null && segs.length) {
      duration_minutes = segs.reduce((sum, s) => sum + (parseISODurToMin(s?.duration) || 0), 0) || null;
    }

    out.push({
      id: `${airline}-${gate}-${depart_date || Math.random().toString(36).slice(2)}`,
      airline,
      gate,
      price: priceNum,                // raw in INR
      currency,                       // INR
      from_iata: from_iata ? String(from_iata).toUpperCase() : null,
      to_iata: to_iata ? String(to_iata).toUpperCase() : null,
      from: from_iata,
      to: to_iata,
      depart_date,
      depart_time,
      arrive_date,
      arrive_time,
      duration_minutes,
      transfers,
    });
  }
  return out;
}

/* =========================
   Airport suggestions
   ========================= */
async function fetchAirportSuggestions(term) {
  const raw = String(term || "").trim();
  if (!raw || raw.length < SUGGEST_MIN_CHARS) return [];

  const q = encodeURIComponent(raw);
  const tryUrls = [
    `/api/airports/search?term=${q}`,
    `/api/airports?term=${q}`,
    `/api/airports/suggest?term=${q}`,
    `/api/airports?q=${q}`,
    `/api/airports/search?q=${q}`,
    `/api/airports/autocomplete?q=${q}`,
    `/api/airports/autocomplete?term=${q}`,
    `/api/airports?query=${q}`,
  ];

  for (const u of tryUrls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const j = await r.json();

      const arr =
        (Array.isArray(j?.data) && j.data) ||
        (Array.isArray(j?.airports) && j.airports) ||
        (Array.isArray(j) && j) ||
        [];

      const list = (arr || [])
        .map((x, idx) => ({
          code: String(x.code || x.iata || x.iataCode || x.airportCode || "").toUpperCase(),
          city: x.city || x.cityName || x.municipality || x.address?.cityName || x.city_code || "",
          name: x.name || x.airport || x.label || x.detailedName || "",
          country: x.country || x.countryName || x.address?.countryName || x.countryCode || "",
          id: `${x.code || x.iata || x.iataCode || x.airportCode || idx}-${idx}`,
        }))
        .filter((s) => s.code);
      if (list.length) return list;
    } catch {}
  }

  // Fallbacks
  if (/^[a-z]{1,3}$/i.test(raw)) {
    const code = raw.toUpperCase().slice(0, 3);
    const known = FALLBACK_AIRPORTS.find(a => a.code === code);
    if (known) return [{ ...known, id: `fb-${code}` }];
    return [{ code, city: "", name: "", country: "", id: `typed-${code}` }];
  }

  const lc = raw.toLowerCase();
  const fb = FALLBACK_AIRPORTS.filter(a =>
    a.code.toLowerCase().startsWith(lc) ||
    a.city.toLowerCase().includes(lc) ||
    a.name.toLowerCase().includes(lc)
  ).slice(0, 10);
  return fb.map((a, i) => ({ ...a, id: `fb-${a.code}-${i}` }));
}

async function resolveToIata(term) {
  if (!term) return "";
  if (isIata(term)) return upIata(term);
  const list = await fetchAirportSuggestions(term);
  return list?.[0]?.code || "";
}

function useDebouncedValue(v, ms) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/* =========================
   Inputs / Live peek
   ========================= */
function AirportInput({ label, value, onChange, onSelect, placeholder, helper }) {
  const [open, setOpen] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const deb = useDebouncedValue(value, SUGGEST_DEBOUNCE_MS);
  const boxRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = String(deb || "").trim();
      if (!raw || raw.length < SUGGEST_MIN_CHARS) {
        if (alive) setSugs([]);
        return;
      }
      setLoading(true);
      const list = await fetchAirportSuggestions(raw);
      if (alive) { setSugs(list); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [deb]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (sugs.length) { onSelect(sugs[0]); setOpen(false); }
          }
        }}
        className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white"
        placeholder={placeholder}
        aria-label={label}
      />
      {helper}
      {open && (loading || sugs.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg max-h-72 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-neutral-500">Searching…</div>}
          {!loading && sugs.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500">No matches</div>
          )}
          {!loading && sugs.map((s) => (
            <button
              key={s.id}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50"
              onClick={() => { onSelect(s); setOpen(false); }}
            >
              <div className="text-sm font-medium text-neutral-800">
                {s.city ? `${s.city} (${s.code})` : s.code}
              </div>
              <div className="text-xs text-neutral-500">
                {s.name}{s.country ? ` • ${s.country}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LivePeek({ fromCode, toInput, date, displayCcy, convertFx }) {
  const debTo = useDebouncedValue(toInput, 300);
  const [state, setState] = useState({ loading: false, list: [] });

  useEffect(() => {
    let ac = new AbortController();
    (async () => {
      if (!fromCode || !debTo || String(debTo).trim().length < SUGGEST_MIN_CHARS) {
        setState({ loading: false, list: [] });
        return;
      }
      setState({ loading: true, list: [] });
      const toC = isIata(debTo) ? upIata(debTo) : await resolveToIata(debTo);
      if (!toC) { setState({ loading: false, list: [] }); return; }

      try {
        // ALWAYS ask backend in INR
        const params = new URLSearchParams({
          originLocationCode: upIata(fromCode),
          destinationLocationCode: toC,
          departureDate: date,
          currencyCode: BACKEND_BASE_CCY,
          adults: "1",
          limit: String(LIVE_PEEK_LIMIT)
        });
        const resp = await fetchWithRetry(`/api/flights/search?${params.toString()}`, { signal: ac.signal }, 3, 300);
        const body = await resp.json();
        const list = normalizeFromBackend(body)
          .filter(x => upIata(x.from_iata || x.from) === upIata(fromCode)
                    && upIata(x.to_iata || x.to) === toC)
          .slice(0, LIVE_PEEK_LIMIT)
          .map(x => ({
            ...x,
            display_currency: displayCcy,
            display_price: convertFx(x.price, BACKEND_BASE_CCY, displayCcy),
            converted: (displayCcy !== BACKEND_BASE_CCY)
          }));
        setState({ loading: false, list });
      } catch {
        setState({ loading: false, list: [] });
      }
    })();
    return () => ac.abort();
  }, [fromCode, debTo, date, displayCcy, convertFx]);

  if (!fromCode) return null;
  if (!state.loading && state.list.length === 0) return null;

  return (
    <div className="mt-2 relative z-10 rounded-lg border border-neutral-200 bg-white shadow-sm p-2 text-sm" aria-live="polite">
      <div className="text-xs text-neutral-600 mb-1">
        {state.loading ? "Live options…" : `Live options for ${fromCode} → ${String(debTo).toUpperCase().slice(0,15)} on ${date}`}
      </div>
      {state.loading ? (
        <div className="h-10 animate-pulse bg-neutral-100 rounded" />
      ) : (
        <ul className="space-y-1 max-h-40 overflow-auto pr-1">
          {state.list.map(it => (
            <li key={it.id} className="flex items-center justify-between">
              <span className="text-neutral-700">{it.airline || "—"}{it.gate ? ` ${it.gate}` : ""}</span>
              <span className="text-neutral-500 text-xs">{minutesToHM(it.duration_minutes)} • {it.transfers === 0 ? "Direct" : `${it.transfers} stop${it.transfers>1?"s":""}`}</span>
              <span className="font-medium tabular-nums">{priceFmt(it.display_currency, it.display_price, it.converted)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =========================
   Small UI pieces
   ========================= */
const AirlineChip = ({ code }) => (
  <div className="h-9 w-9 rounded-md bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-700">
    {code ? code.slice(0, 2) : "✈︎"}
  </div>
);

/* ===== Date strip ===== */
function DateStrip({ date, onChange, priceMap }) {
  const days = Array.from({ length: STRIP_SPAN * 2 + 1 }, (_, i) => addDays(date, i - STRIP_SPAN));
  return (
    <div className="sticky top-16 z-10 border-b border-neutral-200 bg-[#0d1b2a] text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
        {days.map((d) => {
          const active = d === date;
          const cheapest = priceMap?.[d]; // { amount, currency, approx }
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className={`min-w=[116px] px-3 py-2 rounded-lg border text-sm transition
                ${active ? "bg-white text-[#0d1b2a] border-white"
                         : "bg-white/10 border-white/15 hover:bg-white/20"}`}
            >
              <div className="font-medium">{fmtDay(d)}</div>
              <div className={`text-xs ${active ? "text-[#0d1b2a]/70" : "text-white/80"}`}>
                {cheapest ? priceFmt(cheapest.currency, cheapest.amount, cheapest.approx) : "select"}
              </div>
            </button>
          );
        })}
        <button
          className="ml-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-sm hover:bg-white/20"
          onClick={() => onChange(date.slice(0, 7))}
          title="Show whole month"
        >
          Flexible dates
        </button>
      </div>
    </div>
  );
}

/* ===== Filters panel ===== */
function Filters({ stops, setStops, depRange, setDepRange, durMax, setDurMax, onClear }) {
  const endLabel = depRange[1] === 24 ? "23:59" : `${String(depRange[1]).padStart(2, "0")}:59`;
  return (
    <aside className="bg-white/90 backdrop-blur border border-neutral-200 rounded-xl p-4 sticky top=[116px] self-start">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-neutral-800">Stops</h3>
        <button
          onClick={onClear}
          className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
        >
          Clear filters
        </button>
      </div>

      <div className="space-y-2 mb-5">
        {[
          { key: "direct", label: "Direct" },
          { key: "one", label: "1 stop" },
          { key: "twoPlus", label: "2+ stops" },
        ].map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-neutral-900"
              checked={stops[opt.key]}
              onChange={(e) => setStops((s) => ({ ...s, [opt.key]: e.target.checked }))}
            />
            <span className="text-neutral-700">{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-neutral-200 pt-4 mt-2">
        <h4 className="text-sm font-semibold text-neutral-800 mb-2">Departure times</h4>
        <div className="text-xs text-neutral-600 mb-2">
          {String(depRange[0]).padStart(2, "0")}:00 – {endLabel}
        </div>
        <div className="flex items-center gap-2">
          <input
            aria-label="Departure start hour"
            type="range"
            min={0}
            max={24}
            value={depRange[0]}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), depRange[1]);
              setDepRange([v, depRange[1]]);
            }}
            className="w-full accent-neutral-900"
          />
          <input
            aria-label="Departure end hour"
            type="range"
            min={0}
            max={24}
            value={depRange[1]}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), depRange[0]);
              setDepRange([depRange[0], v]);
            }}
            className="w-full accent-neutral-900"
          />
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-neutral-800 mb-2">Journey duration</h4>
        <div className="text-xs text-neutral-600 mb-2">up to {Math.round(durMax / 60)}h</div>
        <input
          aria-label="Maximum duration"
          type="range"
          min={60}
          max={DURATION_MAX_MIN}
          value={durMax}
          onChange={(e) => setDurMax(Number(e.target.value))}
          className="w-full accent-neutral-900"
        />
      </div>
    </aside>
  );
}

/* ===== Summary band ===== */
function SummaryBand({ list, sort, setSort }) {
  const cheapest = useMemo(() => (list.length ? [...list].sort((a, b) => a.display_price - b.display_price)[0] : null), [list]);
  const fastest  = useMemo(() => (list.length ? [...list].sort((a, b) => (a.duration_minutes ?? 9e9) - (b.duration_minutes ?? 9e9))[0] : null), [list]);
  const best     = useMemo(() => {
    if (!list.length) return null;
    const s = (x) => (Number(x.display_price) || 9e9) + ((Number(x.duration_minutes ?? 180) || 180) + (x.transfers || 0) * 40) * 20;
    return [...list].sort((a, b) => s(a) - s(b))[0];
  }, [list]);

  const Card = ({ label, item, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-1 text-left rounded-xl border px-4 py-3 transition shadow-sm ${
        active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <div className={`text-xs ${active ? "text-white/80" : "text-neutral-500"}`}>{label}</div>
      <div className="text-xl font-semibold tabular-nums">
        {item ? priceFmt(item.display_currency, item.display_price, item.converted) : "—"}
      </div>
      <div className={`text-xs ${active ? "text-white/80" : "text-neutral-500"}`}>
        {item ? minutesToHM(item.duration_minutes) : ""}
      </div>
    </button>
  );

  return (
    <div className="flex items-stretch gap-3">
      <Card label="Best"     item={best}     active={sort === "best"}     onClick={() => setSort("best")} />
      <Card label="Cheapest" item={cheapest} active={sort === "cheapest"} onClick={() => setSort("cheapest")} />
      <Card label="Fastest"  item={fastest}  active={sort === "fastest"}  onClick={() => setSort("fastest")} />
    </div>
  );
}

/* ===== Result card ===== */
function ResultCard({ item, onSelect, isSelected = false }) {
  const dep = pickTime(item, "depart_time", "depart_date");
  const arr = pickTime(item, "arrive_time", "arrive_date");
  const hasTimes = Boolean(dep && arr);

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
      isSelected 
        ? "border-blue-500 bg-blue-50 shadow-lg" 
        : "border-neutral-200 bg-white hover:shadow-md"
    }`}>
      <div className="grid grid-cols-[auto,1fr,auto] gap-4 p-4 sm:p-5">
        {/* airline */}
        <div className="flex items-center gap-3">
          <AirlineChip code={item.airline} />
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{item.airline || "Multiple"}</span>
            <span className="text-xs text-neutral-500">{item.gate || "—"}</span>
          </div>
        </div>

        {/* timeline / schedule */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-end gap-2">
            <div className="text-xl sm:text-3xl font-semibold tabular-nums">{dep || "—:—"}</div>
            <div className="text-xs text-neutral-500">{item.from_iata || item.from}</div>
          </div>

          {hasTimes ? (
            <div className="relative flex flex-col items-center mx-1 sm:mx-0 min-w-[220px]">
              <div className="relative w-full h-px bg-neutral-300 my-2">
                <svg className="absolute right-[12%] -top-[7px] rotate-90 text-neutral-400" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.5 19l8.5-7-8.5-7v5l6 2-6 2v5zm19-7l-8.5-7v5l6 2-6 2v5l8.5-7z" />
                </svg>
              </div>
              <div className="text-xs text-neutral-500">{minutesToHM(item.duration_minutes)}</div>
              <div className="text-xs font-medium text-emerald-700 mt-0.5">
                {item.transfers === 0 ? "Direct" : item.transfers === 1 ? "1 stop" : `${item.transfers}+ stops`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center mx-1 sm:mx-0 min-w-[220px]">
              <div className="text-xs text-neutral-500 mt-1">Schedule not provided</div>
              <div className="text-xs font-medium text-emerald-700 mt-1">
                {item.transfers === 0 ? "Direct" : item.transfers === 1 ? "1 stop" : `${item.transfers}+ stops`}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="text-xl sm:text-3xl font-semibold tabular-nums">{arr || "—:—"}</div>
            <div className="text-xs text-neutral-500">{item.to_iata || item.to}</div>
          </div>

          <div className="mt-1 text-xs text-neutral-500">
            {item.depart_date && item.arrive_date && item.depart_date.slice(0,10) !== item.arrive_date.slice(0,10)
              ? `Arrives ${item.arrive_date?.slice(0, 10)}`
              : ""}
          </div>
        </div>

        {/* price / CTA */}
        <div className="flex sm:flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-xs text-neutral-500">from</div>
            <div className="text-2xl font-semibold tabular-nums">
              {priceFmt(item.display_currency, item.display_price, item.converted)}
            </div>
          </div>
          <button
            onClick={onSelect}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isSelected
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {isSelected ? "Selected" : "Select"}
            {isSelected ? (
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
                <path fill="currentColor" d="M8 5l7 7l-7 7V5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Compact Search Bar ===== */
function SearchControls({ initDate, initRet, initCur, onSubmit, currentFromIata, onClear, convertFx, presetFrom = "", presetTo = "", autoSubmit = false }) {
  // allow optional prefill from URL
  const [fromText, setFromText] = useState(presetFrom || "");
  const [toText, setToText] = useState(presetTo || "");
  const [date, setDate] = useState(initDate);
  const [ret, setRet] = useState(initRet || "");
  const [currency, setCurrency] = useState((initCur || "INR").toUpperCase());
  const [err, setErr] = useState("");

  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");

  async function doSubmit(e) {
    e?.preventDefault?.();
    setErr("");

    let f = fromCode || fromText;
    let t = toCode || toText;
    if (!isIata(f)) f = await resolveToIata(f);
    if (!isIata(t)) t = await resolveToIata(t);

    if (!isIata(f) || !isIata(t)) {
      setErr("Please select valid airports from the suggestions.");
      return;
    }
    onSubmit({ from: upIata(f), to: upIata(t), date, ret, currency });
  }

  // If presets provided with autoSubmit, trigger once on mount
  useEffect(() => {
    if (autoSubmit && (presetFrom || fromText) && (presetTo || toText)) {
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needFromPick = !!fromText && !isIata(fromCode) && !isIata(fromText);
  const needToPick = !!toText && !isIata(toCode) && !isIata(toText);

  return (
    <form onSubmit={doSubmit} className="mb-4 grid grid-cols-1 md:grid-cols-[1fr,1fr,auto,auto,auto] gap-3 items-end">
      <AirportInput
        label="From"
        value={fromText}
        onChange={(v) => { setFromText(v); setFromCode(""); }}
        onSelect={(s) => { setFromText(s.code); setFromCode(s.code); }}
        placeholder="e.g., DEL or Delhi"
        helper={needFromPick ? <div className="mt-1 text-xs text-amber-700">Pick an option from the list</div> : null}
      />
      <div>
        <AirportInput
          label="To"
          value={toText}
          onChange={(v) => { setToText(v); setToCode(""); }}
          onSelect={(s) => { setToText(s.code); setToCode(s.code); }}
          placeholder="e.g., LHR or London"
          helper={needToPick ? <div className="mt-1 text-xs text-amber-700">Pick an option from the list</div> : null}
        />
        <LivePeek
          fromCode={currentFromIata || (isIata(fromCode) ? fromCode : (isIata(fromText) ? upIata(fromText) : ""))}
          toInput={toText}
          date={toISO(date)}
          displayCcy={currency}
          convertFx={convertFx}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Departure</label>
        <input type="date" value={toISO(date)} onChange={(e) => setDate(toISO(e.target.value))}
               className="px-3 py-2 rounded-lg border border-neutral-300 bg-white w-full" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Return (optional)</label>
        <input type="date" value={ret} onChange={(e) => setRet(e.target.value)}
               className="px-3 py-2 rounded-lg border border-neutral-300 bg-white w-full" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600 mb-1">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="px-3 py-2 rounded-lg border border-neutral-300 bg-white w-full">
            {SUPPORTED_CCYS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="self-end h-[38px] px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50"
          title="Clear route"
        >
          Clear
        </button>
        <button type="submit" className="self-end h-[38px] px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition">
          Search
        </button>
      </div>

      {(err || needFromPick || needToPick) && (
        <div className="md:col-span-5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {err || "Please select valid airports from the suggestions."}
        </div>
      )}
    </form>
  );
}

/* ===== Booking Flow Component ===== */
function BookingFlow({ selectedFlight, onClose, onProceed }) {
  if (!selectedFlight) return null;

  const dep = pickTime(selectedFlight, "depart_time", "depart_date");
  const arr = pickTime(selectedFlight, "arrive_time", "arrive_date");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-900">Flight Details</h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Flight Summary */}
            <div className="border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AirlineChip code={selectedFlight.airline} />
                  <div>
                    <div className="font-semibold">{selectedFlight.airline} {selectedFlight.gate}</div>
                    <div className="text-sm text-neutral-500">
                      {selectedFlight.transfers === 0 ? "Direct" : `${selectedFlight.transfers} stop${selectedFlight.transfers > 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {priceFmt(selectedFlight.display_currency, selectedFlight.display_price, selectedFlight.converted)}
                  </div>
                  <div className="text-sm text-neutral-500">per person</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl font-semibold">{dep || "—:—"}</div>
                  <div className="text-sm text-neutral-500">{selectedFlight.from_iata}</div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="relative">
                    <div className="w-full h-px bg-neutral-300"></div>
                    <div className="absolute right-0 -top-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400">
                        <path d="M2.5 19l8.5-7-8.5-7v5l6 2-6 2v5zm19-7l-8.5-7v5l6 2-6 2v5l8.5-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center text-sm text-neutral-500 mt-1">
                    {minutesToHM(selectedFlight.duration_minutes)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{arr || "—:—"}</div>
                  <div className="text-sm text-neutral-500">{selectedFlight.to_iata}</div>
                </div>
              </div>
            </div>

            {/* Booking Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What would you like to do?</h3>
              
              <div className="grid gap-3">
                <button
                  onClick={() => onProceed('book')}
                  className="w-full p-4 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-left"
                >
                  <div className="font-semibold">Book this flight</div>
                  <div className="text-sm">Complete your booking with payment</div>
                </button>
                
                <button
                  onClick={() => onProceed('save')}
                  className="w-full p-4 border border-neutral-300 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition text-left"
                >
                  <div className="font-semibold">Save for later</div>
                  <div className="text-sm">Add to your saved flights</div>
                </button>
                
                <button
                  onClick={() => onProceed('share')}
                  className="w-full p-4 border border-neutral-300 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition text-left"
                >
                  <div className="font-semibold">Share flight details</div>
                  <div className="text-sm">Send details to travel companions</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main page
   ========================= */
export default function Flights() {
  const q = useQuery();
  const nav = useNavigate();
  const { showSuccess, showError, showInfo } = useNotifications();
  const { setOrigin, setDestination, setDates, setAdults, selectFlight } = useTripCart();

  // NEW: accept multiple param names so old links keep working
  const fromParam = qp(q, ["from", "origin", "src", "originLocationCode"], "");
  const toParam   = qp(q, ["to", "dest", "destination", "destinationLocationCode"], "");

  // date + return (any of these names)
  const date = toISO(
    qp(q, ["date", "depart", "departureDate"], new Date().toISOString().slice(0, 10))
  );
  const ret  = qp(q, ["ret", "return", "returnDate"], "");

  // currency (support both UI & backend name)
  const displayCurrency = qp(q, ["currency", "ccy", "cur", "currencyCode"], "INR").toUpperCase();

  const [fromIata, setFromIata] = useState("");
  const [toIata, setToIata] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState([]);
  
  // Selection state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);

  // FX cache
  const [fx, setFx] = useState(DEFAULT_FX_FROM_INR);
  const convertFx = useMemo(() => makeFxConverter(fx), [fx]);

  // filters
  const DEFAULT_STOPS = { direct: true, one: true, twoPlus: true };
  const DEFAULT_DEP_RANGE = [0, 24];
  const DEFAULT_DUR_MAX = DURATION_MAX_MIN;

  const [sort, setSort] = useState("best");
  const [stops, setStops] = useState(DEFAULT_STOPS);
  const [depRange, setDepRange] = useState(DEFAULT_DEP_RANGE);
  const [durMax, setDurMax] = useState(DEFAULT_DUR_MAX);

  const [stripPrices, setStripPrices] = useState({}); // { [date]: {amount, currency, approx} }

  // Load FX from backend (if available)
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchFxFromApi();
      if (alive && r) setFx(r);
    })();
    return () => { alive = false; };
  }, []);

  // Resolve any free text in URL to IATA for fetching results (safe guard)
  useEffect(() => {
    let alive = true;
    (async () => {
      const f = isIata(fromParam) ? upIata(fromParam) : await resolveToIata(fromParam);
      const t = isIata(toParam) ? upIata(toParam) : await resolveToIata(toParam);
      if (!alive) return;
      setFromIata(f);
      setToIata(t);
      // Persist to TripCart when we have enough info
      try {
        if (f) setOrigin(f);
        if (t) setDestination(t);
        if (date) setDates(date, ret || date);
        const ad = Number(q.get('adults') || 1);
        if (ad) setAdults(ad);
      } catch {}
    })();
    return () => { alive = false; };
  }, [fromParam, toParam, date, ret]);

  // Reset filters whenever route changes (prevents “no results” from old filters)
  useEffect(() => {
    setStops({ direct: true, one: true, twoPlus: true });
    setDepRange([0, 24]);
    setDurMax(DURATION_MAX_MIN);
    setSort("best");
  }, [fromIata, toIata, date, ret]);

  // Fetch flights (ALWAYS in INR), then convert for display
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fromIata || !toIata) { setLoading(false); setData([]); return; }
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          originLocationCode: fromIata,
          destinationLocationCode: toIata,
          departureDate: date,
          adults: "1",
          currencyCode: BACKEND_BASE_CCY, // force INR from backend
        });
        if (ret) params.set("returnDate", ret);

        const resp = await fetchWithRetry(`/api/flights/search?${params.toString()}`);
        const body = await resp.json();

        const normalizedINR = normalizeFromBackend(body)
          .filter(x =>
            (x.from_iata || x.from)?.toUpperCase() === fromIata &&
            (x.to_iata || x.to)?.toUpperCase() === toIata
          );

        // Convert to display currency
        const converted = normalizedINR.map(x => ({
          ...x,
          display_currency: displayCurrency,
          display_price: convertFx(x.price, BACKEND_BASE_CCY, displayCurrency),
          converted: displayCurrency !== BACKEND_BASE_CCY
        }));

        if (alive) setData(Array.isArray(converted) ? converted : []);
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fromIata, toIata, date, ret, displayCurrency, convertFx]);

  // Date-strip probes (INR fetch, then convert to selected currency)
  useEffect(() => {
    if (!STRIP_PRICE_PROBES || !fromIata || !toIata) return;
    let cancel = false;

    async function probeDay(d) {
      const params = new URLSearchParams({
        originLocationCode: fromIata,
        destinationLocationCode: toIata,
        departureDate: d,
        adults: "1",
        currencyCode: BACKEND_BASE_CCY,
        limit: String(STRIP_LIMIT_PER_DAY),
      });
      try {
        const resp = await fetchWithRetry(`/api/flights/search?${params.toString()}`);
        const body = await resp.json();
        const norm = normalizeFromBackend(body)
          .filter(x =>
            (x.from_iata || x.from)?.toUpperCase() === fromIata &&
            (x.to_iata || x.to)?.toUpperCase() === toIata
          );
        if (!Array.isArray(norm) || norm.length === 0) return;
        const cheapestINR = norm.reduce((min, x) => Math.min(min, Number(x.price || 1e12)), 1e12);
        const converted = convertFx(cheapestINR, BACKEND_BASE_CCY, displayCurrency);
        if (!cancel) setStripPrices(m => ({
          ...m,
          [d]: { amount: converted, currency: displayCurrency, approx: displayCurrency !== BACKEND_BASE_CCY }
        }));
      } catch {}
    }

    const days = Array.from({ length: STRIP_SPAN * 2 + 1 }, (_, i) => addDays(date, i - STRIP_SPAN));
    days.forEach((d) => probeDay(d));
    return () => { cancel = true; };
  }, [fromIata, toIata, date, displayCurrency, convertFx]);

  const hasStopsFilter = !stops.direct || !stops.one || !stops.twoPlus;
  const hasTimeFilter = !(depRange[0] === 0 && depRange[1] === 24);
  const hasDurFilter = durMax < DURATION_MAX_MIN;

  const filtered = useMemo(() => {
    let out = data.slice();

    if (hasStopsFilter) {
      out = out.filter((x) => {
        const t = x.transfers ?? 0;
        if (t === 0 && !stops.direct) return false;
        if (t === 1 && !stops.one) return false;
        if (t >= 2 && !stops.twoPlus) return false;
        return true;
      });
    }

    if (hasTimeFilter) {
      out = out.filter((x) => {
        const dep = pickTime(x, "depart_time", "depart_date");
        if (!dep) return true;
        const [hh] = dep.split(":").map(Number);
        const endHour = depRange[1] === 24 ? 23.99 : depRange[1];
        return hh >= depRange[0] && hh <= endHour;
      });
    }

    if (hasDurFilter) {
      out = out.filter((x) => (x.duration_minutes ?? 1e9) <= durMax);
    }

    const bestScore = (x) => {
      const price = Number(x.display_price) || 9e9;
      const dur = Number(x.duration_minutes ?? 180) || 180;
      const stopPenalty = (x.transfers || 0) * 40;
      return price + (dur + stopPenalty) * 20;
    };

    if (sort === "cheapest") out.sort((a, b) => a.display_price - b.display_price);
    else if (sort === "fastest") out.sort((a, b) => (a.duration_minutes ?? 9e9) - (b.duration_minutes ?? 9e9));
    else out.sort((a, b) => bestScore(a) - bestScore(b));

    return out;
  }, [data, sort, stops, depRange, durMax, hasStopsFilter, hasTimeFilter, hasDurFilter]);

  const total = filtered.length;

  const navigateSearch = ({ from, to, date: d, ret: r, currency }) => {
    const params = new URLSearchParams({ from, to, date: toISO(d), currency });
    if (r) params.set("ret", r);
    nav(`/flights?${params.toString()}`);
  };

  function updateDate(newDate) {
    const d = newDate?.length === 7 ? `${newDate}-01` : newDate;
    const params = new URLSearchParams({
      from: fromIata || fromParam,
      to: toIata || toParam,
      date: d,
      currency: displayCurrency,
    });
    if (ret) params.set("ret", ret);
    nav(`/flights?${params.toString()}`);
  }

  const clearFilters = () => {
    setStops({ direct: true, one: true, twoPlus: true });
    setDepRange([0, 24]);
    setDurMax(DURATION_MAX_MIN);
  };

  const filtersApplied = hasStopsFilter || hasTimeFilter || hasDurFilter;

  // Selection handlers
  const handleFlightSelect = (flight) => {
    setSelectedFlight(flight);
    setShowBookingFlow(true);
  };

  const handleBookingProceed = (action) => {
    switch (action) {
      case 'book': {
        // Save to cart and go to Hotels with prefilled params
        try { selectFlight(selectedFlight); } catch {}
        const params = new URLSearchParams();
        const city = (toIata || toParam || '').toUpperCase();
        const checkIn = date;
        const checkOut = ret || date;
        if (city) params.set('city', city);
        if (checkIn) params.set('checkIn', checkIn);
        if (checkOut) params.set('checkOut', checkOut);
        params.set('guests', String(Number(q.get('adults') || 1)));
        nav(`/hotels?${params.toString()}`);
        break;
      }
      case 'save':
        // Save to localStorage or user account
        const savedFlights = JSON.parse(localStorage.getItem('savedFlights') || '[]');
        savedFlights.push({
          ...selectedFlight,
          savedAt: new Date().toISOString()
        });
        localStorage.setItem('savedFlights', JSON.stringify(savedFlights));
        showSuccess('Flight saved to your favorites!');
        break;
      case 'share':
        // Generate shareable link or copy to clipboard
        const shareText = `Check out this flight: ${selectedFlight.from_iata} → ${selectedFlight.to_iata} on ${selectedFlight.depart_date} for ${priceFmt(selectedFlight.display_currency, selectedFlight.display_price, selectedFlight.converted)}`;
        navigator.clipboard.writeText(shareText);
        showSuccess('Flight details copied to clipboard!');
        break;
    }
    setShowBookingFlow(false);
    setSelectedFlight(null);
  };

  const handleCloseBooking = () => {
    setShowBookingFlow(false);
    setSelectedFlight(null);
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <DateStrip date={date} onChange={updateDate} priceMap={stripPrices} />

      {/* Trip Stepper */}
      <div className="sticky top-14 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">Plan</span>
            <span className="text-neutral-400">→</span>
            <span className="px-2 py-1 rounded-full bg-neutral-900 text-white shadow">Flights</span>
            <span className="text-neutral-400">→</span>
            <span className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border">Hotels</span>
            <span className="text-neutral-400">→</span>
            <span className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border">Finalize</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav('/trip-planner', { state: { restorePlanFromCtx: true } })}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm hover:bg-neutral-50 shadow-sm"
            >
              Back to Plan
            </button>
            <button
              onClick={() => {
                const city = (toIata || toParam || '').toUpperCase();
                const checkIn = date;
                const checkOut = ret || date;
                const params = new URLSearchParams();
                if (city) params.set('city', city);
                if (checkIn) params.set('checkIn', checkIn);
                if (checkOut) params.set('checkOut', checkOut);
                params.set('guests', String(1));
                nav(`/hotels?${params.toString()}`);
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800 shadow"
            >
              Next: Hotels
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search row (starts blank) */}
        <SearchControls
          initDate={date}
          initRet={ret}
          initCur={displayCurrency}
          onSubmit={navigateSearch}
          currentFromIata={fromIata}
          onClear={() => nav("/flights")}
          convertFx={convertFx}
          presetFrom={fromParam}
          presetTo={toParam}
          autoSubmit={Boolean(fromParam && toParam)}
        />

        {/* header */}
        <div className="mb-4">
          <div className="text-sm text-neutral-500">
            {new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} • {displayCurrency}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
            Flights {(fromIata || fromParam || "—").toUpperCase()} → {(toIata || toParam || "—").toUpperCase()}
          </h1>
        </div>

        {/* top row: sort */}
        <div className="flex items-center justify-end mb-4">
          <div className="text-sm text-neutral-600">
            {total} result{total === 1 ? "" : "s"} • sort{" "}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="ml-1 border border-neutral-300 rounded-md px-2 py-1 bg-white"
            >
              <option value="best">Best</option>
              <option value="cheapest">Cheapest</option>
              <option value="fastest">Fastest</option>
            </select>
          </div>
        </div>

        {/* summary band */}
        {!loading && !err && total > 0 && (
          <div className="mb-5">
            <SummaryBand list={filtered} sort={sort} setSort={setSort} />
          </div>
        )}

        {/* layout: filters + results */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
          <Filters
            stops={stops}
            setStops={setStops}
            depRange={depRange}
            setDepRange={setDepRange}
            durMax={durMax}
            setDurMax={setDurMax}
            onClear={clearFilters}
          />

          <section>
            {loading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-28 bg-white border border-neutral-200 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && err && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4">
                Error: {err}
              </div>
            )}

            {!loading && !err && total === 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700">
                {filtersApplied ? (
                  <div>
                    <div className="font-medium mb-1">No results for these filters.</div>
                    <button
                      onClick={clearFilters}
                      className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md border border-neutral-300 text-sm hover:bg-neutral-50"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div>
                    {(!fromIata || !toIata)
                      ? "Start by choosing both origin and destination above."
                      : "No flights found for this day."}
                  </div>
                )}
              </div>
            )}

            {!loading && !err && total > 0 && (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onSelect={() => handleFlightSelect(item)}
                    isSelected={selectedFlight?.id === item.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Booking Flow Modal */}
      <BookingFlow
        selectedFlight={selectedFlight}
        onClose={handleCloseBooking}
        onProceed={handleBookingProceed}
      />
    </main>
  );
}
