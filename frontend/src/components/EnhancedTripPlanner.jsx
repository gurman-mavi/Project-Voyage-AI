// frontend/src/components/EnhancedTripPlanner.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import AIChat from "./AIChat";

/**
 * Enhanced TripPlanner with AI Chat Integration
 * - Traditional form + AI conversational interface
 * - Auto-fill form from AI conversations
 * - Smart recommendations and insights
 * - Modern UI with tabs
 */

/* ============================ Constants & Utils ============================ */

const INTERESTS = ["Culture", "Food", "Shopping", "Nightlife", "Beach", "Adventure", "Nature", "History"];

function daysBetween(a, b) {
  const A = new Date(a + "T00:00:00");
  const B = new Date(b + "T00:00:00");
  return Math.max(0, Math.round((B - A) / 86400000));
}

function formatCurrency(v, c = "USD") {
  const num = Number(v || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0
    }).format(num);
  } catch {
    return `${c} ${Math.round(num)}`;
  }
}

function niceDate(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short"
    });
  } catch {
    return iso;
  }
}

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeParse(s) {
  try { return JSON.parse(s || ""); } catch { return null; }
}

function placeholderFor(city) {
  const q = encodeURIComponent(city || "travel city landscape");
  return `https://source.unsplash.com/1200x400/?${q}`;
}

/* ======================= Inline Destination Autocomplete ================== */

function useDebounced(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

function CityIataAutocomplete({
  label = "Destination (IATA or City)",
  value = "",
  onTyping,
  onSelect,
  placeholder = "e.g., DXB, Paris, Goa…",
  minChars = 2
}) {
  const [input, setInput] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(-1);
  const boxRef = useRef(null);
  const debounced = useDebounced(input, 200);

  useEffect(() => { setInput(value || ""); }, [value]);

  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < minChars) { setList([]); return; }
    setLoading(true);
    fetch(`/api/destinations/suggest?q=${encodeURIComponent(q)}&limit=12`)
      .then(r => r.json())
      .then(j => setList(Array.isArray(j.data) ? j.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [debounced, minChars]);

  const choose = (row) => {
    const val = (row?.code || row?.city || "").toUpperCase();
    onSelect?.(val, row);
    setInput(val);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (e.key === "ArrowDown") setIdx(i => Math.min(i + 1, list.length - 1));
    if (e.key === "ArrowUp") setIdx(i => Math.max(i - 1, 0));
    if (e.key === "Enter") { if (idx >= 0 && list[idx]) { e.preventDefault(); choose(list[idx]); } }
    if (e.key === "Escape") setOpen(false);
  };

  useEffect(() => { setIdx(-1); }, [list]);

  return (
    <div className="relative" ref={boxRef}>
      {label && <label className="block text-xs text-slate-500 mb-1">{label}</label>}
      <input
        value={input}
        onChange={(e) => {
          const v = e.target.value;
          setInput(v);
          setOpen(true);
          onTyping?.(v);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>}
          {!loading && list.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Type at least {minChars} letters</div>
          )}
          {!loading && list.length > 0 && (
            <ul className="max-h-72 overflow-auto divide-y divide-slate-100">
              {list.map((s, i) => (
                <li
                  key={s.id}
                  className={`px-3 py-2 text-sm cursor-pointer ${i === idx ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  onMouseDown={() => choose(s)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {s.code || "CITY"}
                    </span>
                    <span className="font-semibold">{s.city}</span>
                    <span className="text-slate-500">— {s.region}</span>
                    <span className="ml-auto text-slate-400">{s.country}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-1 text-[11px] text-slate-500">Tip: pick from the list or paste an IATA like "DXB".</p>
    </div>
  );
}

/* ================================ Main Component ==================================== */

export default function EnhancedTripPlanner() {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'form'
  const [form, setForm] = useState(() => {
    const saved = safeParse(localStorage.getItem("trip_form"));
    return (
      saved || {
        origin: "DEL",
        destination: "IST",
        start: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        end: new Date(Date.now() + 19 * 86400000).toISOString().slice(0, 10),
        budget: 1200,
        adults: 1,
        interests: ["Culture", "Food"]
      }
    );
  });

  useEffect(() => {
    localStorage.setItem("trip_form", JSON.stringify(form));
  }, [form]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const nights = useMemo(() => daysBetween(form.start, form.end), [form.start, form.end]);

  // Handle AI intent extraction
  const handleIntentExtracted = (intent) => {
    if (intent) {
      const updates = {};
      
      if (intent.origin) updates.origin = intent.origin;
      if (intent.destination) updates.destination = intent.destination;
      if (intent.dates?.start) updates.start = intent.dates.start;
      if (intent.dates?.end) updates.end = intent.dates.end;
      if (intent.budget) updates.budget = intent.budget;
      if (intent.adults) updates.adults = intent.adults;
      if (intent.interests && intent.interests.length > 0) {
        updates.interests = intent.interests;
      }
      
      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }));
        setActiveTab('form'); // Switch to form tab to show filled data
      }
    }
  };

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    setLoading(true);
    setPlan(null);
    setAiInsights(null);
    
    try {
      const r = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: (form.origin || "").toUpperCase(),
          destination: (form.destination || "").toUpperCase(),
          dates: { start: form.start, end: form.end },
          budget: Number(form.budget || 0),
          interests: form.interests,
          pax: { adults: Number(form.adults || 1) },
          cabin: "ECONOMY"
        })
      });
      
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setPlan(j?.data || null);

      // Get AI insights for the trip
      try {
        const insightsRes = await fetch("/api/ai/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripData: {
              destination: form.destination,
              budget: form.budget,
              interests: form.interests,
              duration: nights
            }
          })
        });
        
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setAiInsights(insightsData.recommendations);
        }
      } catch (insightsError) {
        console.error('Failed to get AI insights:', insightsError);
      }
      
    } catch (e2) {
      setErr(e2.message || "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  }

  function toggleInterest(tag) {
    setForm((f) => {
      const set = new Set(f.interests || []);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      return { ...f, interests: Array.from(set) };
    });
  }

  return (
    <div className="text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-bold">AI-Powered Trip Planner</h1>
          <p className="text-slate-600">
            Chat with AI or use the form — we'll create your perfect travel plan.
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 AI Chat
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'form'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 Form
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        {activeTab === 'ai' ? (
          <div className="h-[600px]">
            <AIChat 
              onIntentExtracted={handleIntentExtracted}
              onPlanGenerated={setPlan}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Form */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Trip Details</h2>
              <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Origin (IATA)">
                  <input
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                    placeholder="DEL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
                    required
                  />
                </Field>

                <Field label="">
                  <CityIataAutocomplete
                    label="Destination (IATA or City)"
                    value={form.destination}
                    onTyping={(v) => setForm({ ...form, destination: (v || "").toUpperCase() })}
                    onSelect={(val) => setForm({ ...form, destination: val })}
                    placeholder="IST or ISTANBUL"
                  />
                </Field>

                <Field label="Budget (USD)">
                  <input
                    type="number"
                    min={100}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value || 0) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </Field>
                
                <Field label="Start date">
                  <input
                    type="date"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
                    required
                  />
                </Field>
                
                <Field label="End date">
                  <input
                    type="date"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
                    required
                  />
                </Field>
                
                <Field label="Adults">
                  <input
                    type="number"
                    min={1}
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: Number(e.target.value || 1) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 outline-none"
                    required
                  />
                </Field>
              </form>

              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-2">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={clsx(
                        "px-3 py-1 rounded-full border text-sm",
                        form.interests.includes(tag)
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      )}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={submit}
                    className="px-6 py-3 rounded-xl font-semibold border border-indigo-300 bg-gradient-to-b from-white to-indigo-50 hover:border-indigo-400 text-indigo-800"
                    disabled={loading}
                  >
                    {loading ? "Planning…" : "Plan my trip"}
                  </button>
                  <span className="text-xs text-slate-500">
                    {nights} {nights === 1 ? "night" : "nights"} • {form.interests.join(" / ")}
                  </span>
                </div>
                {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
              </div>
            </section>

            {/* AI Insights */}
            {aiInsights && (
              <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🤖 AI Insights & Recommendations
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {aiInsights.insights && aiInsights.insights.length > 0 && (
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Insights</h3>
                      <ul className="space-y-1">
                        {aiInsights.insights.map((insight, i) => (
                          <li key={i} className="text-sm text-slate-700">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {aiInsights.localTips && aiInsights.localTips.length > 0 && (
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Local Tips</h3>
                      <ul className="space-y-1">
                        {aiInsights.localTips.map((tip, i) => (
                          <li key={i} className="text-sm text-slate-700">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <PlannerSkeleton />
        </section>
      )}

      {!loading && plan && (
        <>
          <Banner destinationToken={plan.trip.destination} />
          <section className="max-w-6xl mx-auto px-4 py-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Your AI-Generated Plan</h2>
              <p className="text-slate-600 text-sm">
                {plan.trip.origin} → {plan.trip.destination} • {plan.trip.dates.start} →{" "}
                {plan.trip.dates.end} • Budget {formatCurrency(plan.trip.budget, "USD")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.options?.map((opt, i) => (
                <OptionCard key={i} option={opt} trip={plan.trip} adults={form.adults} />
              ))}
            </div>

            {Array.isArray(plan.notes) && plan.notes.length > 0 && (
              <div className="mt-6 text-xs text-slate-500 space-y-1">
                {plan.notes.map((n, i) => (
                  <p key={i}>• {n}</p>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* =============================== Components =============================== */

function Field({ label, children }) {
  return (
    <label className="block">
      {label ? <span className="block text-xs text-slate-500 mb-1">{label}</span> : null}
      {children}
    </label>
  );
}

function PlannerSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-40 bg-slate-200 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 bg-slate-200 animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-slate-200 animate-pulse rounded" />
            <div className="h-24 w-full bg-slate-200 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------- Destination Banner with image API + credit overlay ---------- */

const imgCache = new Map();

function Banner({ destinationToken }) {
  const [cityMeta, setCityMeta] = useState(null);
  const [img, setImg] = useState("");
  const [credit, setCredit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    let live = true;
    async function run() {
      try {
        const r = await fetch(
          `/api/destinations/catalog?q=${encodeURIComponent(destinationToken)}&limit=1`
        );
        const j = await r.json();
        const first = Array.isArray(j.data) ? j.data[0] : null;
        const cityName = first?.cityName || destinationToken;
        const country = first?.country || "";
        if (!live) return;
        setCityMeta({ cityName, country });

        const key = `${cityName.toLowerCase()}|${country.toUpperCase()}`;
        if (imgCache.has(key)) {
          const c = imgCache.get(key);
          setImg(c.url);
          setCredit(c.credit || "");
          setSourceUrl(c.sourceUrl || "");
          return;
        }

        const ri = await fetch(
          `/api/images/destination?city=${encodeURIComponent(cityName)}&country=${encodeURIComponent(country)}`
        );
        const ji = await ri.json();
        const url = ji?.data?.imageUrl || placeholderFor(cityName);
        const cred = ji?.data?.credit || "";
        const src = ji?.data?.sourceUrl || "";

        imgCache.set(key, { url, credit: cred, sourceUrl: src });
        if (!live) return;
        setImg(url);
        setCredit(cred);
        setSourceUrl(src);
      } catch {
        setImg(placeholderFor(String(destinationToken || "travel")));
        setCredit("");
        setSourceUrl("");
      }
    }
    run();
    return () => { live = false; };
  }, [destinationToken]);

  if (!img) return null;

  return (
    <div className="w-full bg-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="relative h-48 md:h-56 lg:h-64 rounded-2xl overflow-hidden border border-slate-200">
          <img src={img} alt={cityMeta?.cityName || "Destination"} className="w-full h-full object-cover" />
          {credit && (
            <div className="absolute right-2 bottom-2 text-[11px] text-white bg-black/60 rounded px-2 py-0.5">
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  {credit}
                </a>
              ) : (
                credit
              )}
            </div>
          )}
          {cityMeta?.cityName && (
            <div className="absolute left-3 bottom-2 text-white text-lg font-semibold drop-shadow">
              {cityMeta.cityName}
              {cityMeta.country ? <span className="opacity-80 text-sm ml-2">{cityMeta.country}</span> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Option Card ------------------------------ */

function OptionCard({ option, trip, adults }) {
  const nights = option.hotel?.nights || daysBetween(trip.dates.start, trip.dates.end);
  const flightCost = option.flight?.price || 0;
  const hotelCost = (option.hotel?.price || 0) * nights;
  const total = option.estTotal || flightCost + hotelCost;

  const flightsLink = `/flights?origin=${encodeURIComponent(trip.origin)}&dest=${encodeURIComponent(
    trip.destination
  )}&depart=${trip.dates.start}&return=${trip.dates.end}&adults=${adults || 1}&cabin=ECONOMY`;

  const hotelsLink = `/hotels?city=${encodeURIComponent(trip.destination)}&checkIn=${trip.dates.start}&checkOut=${
    trip.dates.end
  }&rooms=1&guests=${adults || 1}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{option.label}</h3>
          <div className="text-indigo-800 font-bold">{formatCurrency(total, option.flight?.currency || "USD")}</div>
        </div>

        {/* Flight */}
        <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-sm font-semibold">Flight</div>
          <div className="text-sm text-slate-700">
            {option.flight?.summary || "—"} · {formatCurrency(option.flight?.price)}{" "}
            <span className="text-slate-500">({trip.dates.start} → {trip.dates.end})</span>
          </div>
          <a
            href={flightsLink}
            className="mt-2 inline-block text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-white"
          >
            Search flights
          </a>
        </div>

        {/* Hotel */}
        <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-sm font-semibold">Hotel</div>
          <div className="text-sm text-slate-700">
            {option.hotel?.name || "—"} · {formatCurrency(option.hotel?.price)} / night · {nights} nights
          </div>
          <div className="flex gap-2 mt-2">
            {option.hotel?.link && (
              <a
                href={option.hotel.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-white"
              >
                View hotel
              </a>
            )}
            <a
              href={hotelsLink}
              className="text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-white"
            >
              Search hotels
            </a>
          </div>
        </div>
      </div>

      {/* Day by day */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-sm font-semibold mb-2">Daily plan</div>
        <div className="space-y-2">
          {option.dailyPlan?.map((d) => (
            <div key={d.date} className="p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="font-semibold">{niceDate(d.date)}</div>
                {d.weather && <WeatherBadge wx={d.weather} />}
              </div>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {d.blocks?.map((b, i) => (
                  <li key={i}>
                    <span className="text-slate-500">{b.time}</span> — <span className="font-medium">{b.title}</span>
                    {b.notes ? <span className="text-slate-500"> ({b.notes})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function WeatherBadge({ wx }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border border-slate-300 bg-white">
      <span>{wx.summary}</span>
      <span className="text-slate-500">
        {wx.lo}° / {wx.hi}°
      </span>
      <span className="text-slate-500">{wx.precipitation}%</span>
    </span>
  );
}

