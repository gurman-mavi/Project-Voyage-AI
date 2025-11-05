// frontend/src/components/UltraModernTripPlanner.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AIChat from "./AIChat";
// Removed VoiceInterface - replacing with Smart Suggestions
import SmartSuggestions from "./SmartSuggestions";
import AnimatedLoader, { TripCardSkeleton, ChatMessageSkeleton } from "./AnimatedLoader";
import SmartDashboard from "./SmartDashboard";
import SmartTripGuide from "./SmartTripGuide";
import { useTripNavigation } from "../lib/navigation.js";
import { useNotifications } from "../contexts/NotificationContext.jsx";
import { useTripCart } from "../contexts/TripCartContext.jsx";
import storage from "../lib/storage.js";

/**
 * Ultra-Modern Trip Planner with Advanced AI Features
 * - Voice interface
 * - Smooth animations
 * - Smart dashboard
 * - Real-time features
 * - Glassmorphism design
 */

/* ============================ Constants & Utils ============================ */

const INTERESTS = ["Culture", "Food", "Shopping", "Nightlife", "Beach", "Adventure", "Nature", "History", "Photography", "Wellness"];

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

/* ======================= Enhanced Components ================== */

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
        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
      />
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden">
          {loading && <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>}
          {!loading && list.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Type at least {minChars} letters</div>
          )}
          {!loading && list.length > 0 && (
            <ul className="max-h-72 overflow-auto divide-y divide-slate-100">
              {list.map((s, i) => (
                <li
                  key={s.id}
                  className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                    i === idx ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                  onMouseDown={() => choose(s)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 border border-slate-200">
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
    </div>
  );
}

/* ================================ Main Component ==================================== */

export default function UltraModernTripPlanner() {
  const location = useLocation();
  const seedMessage = location?.state?.seedMessage || "";
  const autoSeed = !!location?.state?.autoSeed;
  const [activeTab, setActiveTab] = useState('ai');
  const [agenticStep, setAgenticStep] = useState('destination_selected');
  // Removed voice interface state
  const { goToFlights, goToHotels } = useTripNavigation();
  const { showSuccess, showError } = useNotifications();
  const { setBudget, setAdults, setDates, setDestination } = useTripCart();
  const [form, setForm] = useState(() => {
    return storage.getTripForm();
  });

  const [userPreferences, setUserPreferences] = useState(() => {
    return storage.getUserPreferences();
  });

  useEffect(() => {
    storage.saveTripForm(form);
    storage.trackUsage('form_updated');
    
    // Sync form data to cart for use in Finalize page
    if (form.budget) setBudget(form.budget);
    if (form.adults) setAdults(form.adults);
    if (form.start && form.end) setDates(form.start, form.end);
    if (form.destination) setDestination(form.destination);
  }, [form, setBudget, setAdults, setDates, setDestination]);

  useEffect(() => {
    storage.saveUserPreferences(userPreferences);
  }, [userPreferences]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);

  // persist selected plan context for cross-page navigation
  function savePlannerCtx(idx) {
    try {
      if (!plan?.trip) return;
      const ctx = {
        origin: plan.trip.origin,
        destination: plan.trip.destination,
        dates: plan.trip.dates,
        adults: form.adults,
        selectedPlanIndex: idx
      };
      sessionStorage.setItem('planner_ctx', JSON.stringify(ctx));
      // also persist the selected option's daily plan if present
      const daily = Array.isArray(plan?.options?.[idx]?.dailyPlan) ? plan.options[idx].dailyPlan : null;
      if (daily) sessionStorage.setItem('planner_daily', JSON.stringify(daily));
    } catch {}
  }
  function choosePlan(i) {
    setSelectedIdx(i);
    savePlannerCtx(i);
  }
  useEffect(() => {
    if (location?.state?.restorePlanFromCtx && plan && selectedIdx === null) {
      try {
        const ctx = JSON.parse(sessionStorage.getItem('planner_ctx') || 'null');
        if (ctx && typeof ctx.selectedPlanIndex === 'number') {
          setSelectedIdx(ctx.selectedPlanIndex);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state, plan]);

  const nights = useMemo(() => daysBetween(form.start, form.end), [form.start, form.end]);

  // Helpers to auto-plan when sufficient data is present
  const isFormComplete = (f) => !!(f?.destination && f?.start && f?.end && f?.adults && f?.budget);

  async function submitWith(nextForm) {
    setErr("");
    setLoading(true);
    setPlan(null);
    setAiInsights(null);
    try {
      const r = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: (nextForm.origin || "").toUpperCase(),
          destination: (nextForm.destination || "").toUpperCase(),
          dates: { start: nextForm.start, end: nextForm.end },
          budget: Number(nextForm.budget || 0),
          interests: nextForm.interests,
          pax: { adults: Number(nextForm.adults || 1) },
          cabin: "ECONOMY"
        })
      });
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setPlan(j?.data || null);
      // Save successful trip plan
      if (j?.data) {
        storage.saveTrip({
          origin: nextForm.origin,
          destination: nextForm.destination,
          dates: { start: nextForm.start, end: nextForm.end },
          budget: nextForm.budget,
          adults: nextForm.adults,
          interests: nextForm.interests,
          plan: j.data
        });
        try {
          await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: nextForm.origin,
              destination: nextForm.destination,
              dates: { start: nextForm.start, end: nextForm.end },
              budget: nextForm.budget,
              adults: nextForm.adults,
              interests: nextForm.interests,
              plan: j.data
            })
          });
        } catch {}
        storage.trackUsage('trip_planned', { destination: nextForm.destination, budget: nextForm.budget, duration: nights });
      }
      // AI insights
      try {
        let insightsData = storage.getCachedAIInsights(nextForm.destination);
        if (!insightsData) {
          const insightsRes = await fetch("/api/ai/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripData: { destination: nextForm.destination, budget: nextForm.budget, interests: nextForm.interests, duration: nights } })
          });
          if (insightsRes.ok) {
            insightsData = await insightsRes.json();
            storage.saveAIInsights(nextForm.destination, insightsData.recommendations);
          }
        }
        if (insightsData) setAiInsights(insightsData.recommendations || insightsData);
      } catch (insightsError) {
        console.error('Failed to get AI insights:', insightsError);
      }
    } catch (e2) {
      setErr(e2.message || "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  }

  function planIfReady(nextForm) {
    if (isFormComplete(nextForm)) {
      submitWith(nextForm);
    }
  }

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
        setForm(prev => {
          const next = { ...prev, ...updates };
          setActiveTab('form');
          planIfReady(next);
          return next;
        });
      }
    }
  };

  // Handle smart destination selection
  const handleDestinationSelect = (destinationCode, destinationName) => {
    setForm(prev => {
      const next = { ...prev, destination: destinationCode, destinationName };
      planIfReady(next);
      return next;
    });
    
    // Save to recent destinations
    storage.addRecentDestination({
      code: destinationCode,
      name: destinationName,
      selectedAt: new Date().toISOString()
    });
    
    storage.trackUsage('destination_selected', { destination: destinationCode });
    // Set agentic step to show next steps
    setAgenticStep('destination_selected');
    // Removed success notification for smoother UX
  };

  // Handle agentic AI actions
  const handleAgenticAction = (action, data) => {
    switch (action) {
      case 'destination_selected':
        setAgenticStep('destination_selected');
        break;
      case 'view_form':
        setActiveTab('form');
        break;
      case 'view_ai_chat':
        setActiveTab('ai');
        break;
      case 'submit_form':
        if (isFormComplete(form)) {
          setAgenticStep('form_complete');
          submitWith(form);
        }
        break;
      default:
        console.log('Agentic action:', action, data);
    }
  };

  // Handle quick fill from templates
  const handleQuickFill = (templateData) => {
    setForm(prev => {
      const next = {
        ...prev,
        destination: templateData.destination,
        destinationName: templateData.destinationName,
        interests: templateData.interests,
        adults: templateData.adults,
        budget: templateData.budget
      };
      planIfReady(next);
      return next;
    });
    // Removed success notification for smoother UX
  };

  // Removed voice fallback function - no longer needed

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

      // Save successful trip plan
      if (j?.data) {
        storage.saveTrip({
          origin: form.origin,
          destination: form.destination,
          dates: { start: form.start, end: form.end },
          budget: form.budget,
          adults: form.adults,
          interests: form.interests,
          plan: j.data
        });
        try {
          await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: form.origin,
              destination: form.destination,
              dates: { start: form.start, end: form.end },
              budget: form.budget,
              adults: form.adults,
              interests: form.interests,
              plan: j.data
            })
          });
        } catch {}
        storage.trackUsage('trip_planned', { 
          destination: form.destination,
          budget: form.budget,
          duration: nights
        });
      }

      // Get AI insights for the trip
      try {
        // Check cache first
        let insightsData = storage.getCachedAIInsights(form.destination);
        
        if (!insightsData) {
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
            insightsData = await insightsRes.json();
            storage.saveAIInsights(form.destination, insightsData.recommendations);
          }
        }
        
        if (insightsData) {
          setAiInsights(insightsData.recommendations || insightsData);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
              AI-Powered Trip Planner
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 animate-fade-in-delay">
              Experience the future of travel planning with smart suggestions, AI insights, and real-time recommendations
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-delay-2">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 hover-lift animate-float">
                <span className="text-2xl">✨</span>
                <span className="text-sm font-medium">Smart Suggestions</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 hover-lift animate-float" style={{ animationDelay: '0.5s' }}>
                <span className="text-2xl">🤖</span>
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 hover-lift animate-float" style={{ animationDelay: '1s' }}>
                <span className="text-2xl">📊</span>
                <span className="text-sm font-medium">Smart Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-8 animate-fade-in">
          <div className="flex space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-white/20 hover-glow">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover-lift ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105 animate-pulse-glow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="mr-2">🤖</span>
              AI Chat
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover-lift ${
                activeTab === 'form'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105 animate-pulse-glow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="mr-2">📝</span>
              Smart Form
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover-lift ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105 animate-pulse-glow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="mr-2">📊</span>
              Dashboard
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 animate-slide-in-left">
              <div className="h-[600px]">
                <AIChat 
                  onIntentExtracted={handleIntentExtracted}
                  onPlanGenerated={setPlan}
                  seedMessage={seedMessage}
                  autoSendSeed={autoSeed}
                />
              </div>
            </div>
            <div className="lg:col-span-1 animate-slide-in-right">
              <div className="h-[600px] flex flex-col gap-4">
                {/* Smart Trip Guide */}
                <div className="flex-shrink-0">
                  <SmartTripGuide
                    formData={form}
                    onActionClick={handleAgenticAction}
                  />
                </div>
                
                {/* Smart Suggestions */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-4 shadow-lg hover-lift overflow-hidden">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Smart Suggestions</h3>
                  <div className="h-full overflow-y-auto">
                    <SmartSuggestions
                      onDestinationSelect={handleDestinationSelect}
                      onQuickFill={handleQuickFill}
                      onAgenticAction={handleAgenticAction}
                      userPreferences={{
                        interests: form.interests,
                        budget: form.budget,
                        adults: form.adults,
                        origin: form.origin,
                        startDate: form.start,
                        endDate: form.end,
                        ...userPreferences
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'form' && (
          <div className="space-y-6 animate-fade-in">
            {/* Enhanced Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-lg hover-lift">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 animate-scale-in">Smart Trip Planning</h2>
              <form onSubmit={submit} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Origin (IATA)">
                  <input
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                    placeholder="DEL"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                </Field>
                
                <Field label="Start date">
                  <input
                    type="date"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    required
                  />
                </Field>
                
                <Field label="End date">
                  <input
                    type="date"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    required
                  />
                </Field>
                
                <Field label="Adults">
                  <input
                    type="number"
                    min={1}
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: Number(e.target.value || 1) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    required
                  />
                </Field>
              </form>

              <div className="mt-6">
                <div className="text-sm text-slate-600 mb-3">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={clsx(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                        form.interests.includes(tag)
                          ? "border-indigo-300 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105"
                          : "border-slate-300 bg-white/80 backdrop-blur-sm text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                      )}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={submit}
                    className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Planning...
                      </div>
                    ) : (
                      "🚀 Plan My Trip"
                    )}
                  </button>
                  <div className="text-sm text-slate-600">
                    {nights} {nights === 1 ? "night" : "nights"} • {form.interests.join(" / ")}
                  </div>
                </div>
                {err && <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{err}</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="animate-scale-in">
              <SmartDashboard 
                tripData={form}
                insights={aiInsights}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="max-w-md w-full mx-4 animate-bounce-in">
            <AnimatedLoader 
              message="Creating your perfect trip..."
              showSteps={true}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && plan && (
        <>
          <div className="animate-fade-in">
            <Banner destinationToken={plan.trip.destination} />
          </div>
          <section className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            <div className="mb-6 animate-scale-in">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Your AI-Generated Plan</h2>
              <p className="text-slate-600">
                {plan.trip.origin} → {plan.trip.destination} • {plan.trip.dates.start} →{" "}
                {plan.trip.dates.end} • Budget {formatCurrency(plan.trip.budget, "USD")}
              </p>
              {selectedIdx !== null && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm">
                  Selected: {plan.options?.[selectedIdx]?.label} • {formatCurrency(plan.options?.[selectedIdx]?.estTotal || 0, "USD")}
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {plan.options?.map((opt, i) => (
                <div key={i} className="animate-slide-in-left" style={{ animationDelay: `${i * 0.1}s` }}>
                  <OptionCard 
                    option={opt} 
                    trip={plan.trip} 
                    adults={form.adults}
                    onNavigateToFlights={goToFlights}
                    onNavigateToHotels={goToHotels}
                    selected={selectedIdx === i}
                    onSelect={() => choosePlan(i)}
                  />
                </div>
              ))}
            </div>

            {/* Next Steps Panel */}
            {selectedIdx !== null && (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Book Flights</div>
                  <p className="text-sm text-slate-600">Proceed to flight results for your selected option.</p>
                  <button
                    onClick={() => { try { savePlannerCtx(selectedIdx ?? 0); } catch {}; goToFlights({ origin: plan.trip.origin, destination: plan.trip.destination, dates: plan.trip.dates, adults: form.adults, cabin: 'ECONOMY' }); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    View flights
                  </button>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Book Hotel</div>
                  <p className="text-sm text-slate-600">Open hotel options for these dates.</p>
                  <button
                    onClick={() => { try { savePlannerCtx(selectedIdx ?? 0); } catch {}; goToHotels({ origin: plan.trip.origin, destination: plan.trip.destination, dates: plan.trip.dates, adults: form.adults }); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    View hotels
                  </button>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Save & Share</div>
                  <p className="text-sm text-slate-600">Save this selection and copy a share link.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => storage.saveTrip({ origin: plan.trip.origin, destination: plan.trip.destination, dates: plan.trip.dates, budget: plan.trip.budget, adults: form.adults, interests: form.interests, plan })}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(window.location.href)}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
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
      {label ? <span className="block text-sm text-slate-600 mb-2 font-medium">{label}</span> : null}
      {children}
    </label>
  );
}

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

        const ri = await fetch(
          `/api/images/destination?city=${encodeURIComponent(cityName)}&country=${encodeURIComponent(country)}`
        );
        const ji = await ri.json();
        const url = ji?.data?.imageUrl || placeholderFor(cityName);
        const cred = ji?.data?.credit || "";
        const src = ji?.data?.sourceUrl || "";

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
        <div className="relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl">
          <img src={img} alt={cityMeta?.cityName || "Destination"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          {credit && (
            <div className="absolute right-4 bottom-4 text-xs text-white bg-black/60 rounded px-3 py-1 backdrop-blur-sm">
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
            <div className="absolute left-6 bottom-6 text-white">
              <h2 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
                {cityMeta.cityName}
              </h2>
              {cityMeta.country && (
                <p className="text-lg text-white/90 drop-shadow">
                  {cityMeta.country}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({ option, trip, adults, onNavigateToFlights, onNavigateToHotels, selected = false, onSelect = () => {} }) {
  const nights = option.hotel?.nights || daysBetween(trip.dates.start, trip.dates.end);
  const flightCost = option.flight?.price || 0;
  const hotelCost = (option.hotel?.price || 0) * nights;
  const total = option.estTotal || flightCost + hotelCost;

  const tripData = {
    origin: trip.origin,
    destination: trip.destination,
    dates: trip.dates,
    adults: adults || 1,
    cabin: 'ECONOMY'
  };

  const handleFlightsClick = () => {
    if (onNavigateToFlights) {
      onNavigateToFlights(tripData);
    }
  };

  const handleHotelsClick = () => {
    if (onNavigateToHotels) {
      onNavigateToHotels(tripData);
    }
  };

  return (
    <article className={`rounded-2xl border ${selected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'} bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 card-hover`}>
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">{option.label}</h3>
            {selected && (
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">Selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(total, option.flight?.currency || "USD")}</div>
            {!selected && (
              <button
                onClick={onSelect}
                className="ml-2 text-xs px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Choose this plan
              </button>
            )}
          </div>
        </div>

        {/* Flight */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="text-sm font-semibold text-blue-900 mb-2">✈️ Flight</div>
          <div className="text-sm text-slate-700">
            {option.flight?.summary || "—"} · {formatCurrency(option.flight?.price)}{" "}
            <span className="text-slate-500">({trip.dates.start} → {trip.dates.end})</span>
          </div>
          <button
            onClick={handleFlightsClick}
            className="mt-3 inline-block text-xs px-4 py-2 rounded-full border border-blue-300 bg-white hover:bg-blue-50 transition-colors"
          >
            Search flights
          </button>
        </div>

        {/* Hotel */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="text-sm font-semibold text-green-900 mb-2">🏨 Hotel</div>
          <div className="text-sm text-slate-700">
            {option.hotel?.name || "—"} · {formatCurrency(option.hotel?.price)} / night · {nights} nights
          </div>
          <div className="flex gap-2 mt-3">
            {option.hotel?.link && (
              <a
                href={option.hotel.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-4 py-2 rounded-full border border-green-300 bg-white hover:bg-green-50 transition-colors"
              >
                View hotel
              </a>
            )}
            <button
              onClick={handleHotelsClick}
              className="text-xs px-4 py-2 rounded-full border border-green-300 bg-white hover:bg-green-50 transition-colors"
            >
              Search hotels
            </button>
          </div>
        </div>
      </div>

      {/* Day by day */}
      <div className="p-6 border-t border-slate-200 mt-4">
        <div className="text-sm font-semibold mb-4 text-slate-900">📅 Daily Plan</div>
        <div className="space-y-3">
          {option.dailyPlan?.map((d) => (
            <div key={d.date} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="font-semibold text-slate-900">{niceDate(d.date)}</div>
                {d.weather && <WeatherBadge wx={d.weather} />}
              </div>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {d.blocks?.map((b, i) => (
                  <li key={i} className="text-slate-700">
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
    <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-slate-300 bg-white">
      <span>{wx.summary}</span>
      <span className="text-slate-500">
        {wx.lo}° / {wx.hi}°
      </span>
      <span className="text-slate-500">{wx.precipitation}%</span>
    </span>
  );
}
