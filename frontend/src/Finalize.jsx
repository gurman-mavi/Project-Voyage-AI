import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripCart } from "./contexts/TripCartContext.jsx";
import MultiAgentAnalysis from "./components/MultiAgentAnalysis.jsx";

function fmt(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Math.round(Number(amount || 0)).toLocaleString()}`;
  }
}

export default function Finalize() {
  const { cart, isReadyToFinalize, clear } = useTripCart();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('planner_daily') || 'null'); } catch { return null; }
  });
  const [itLoading, setItLoading] = useState(false);
  const [itError, setItError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMultiAgent, setShowMultiAgent] = useState(false);

  // Guard against uninitialized cart to avoid runtime errors rendering a blank page
  if (!cart || !cart.origin || !cart.destination) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">No trip selected</h2>
          <p className="text-neutral-600 mb-4">Please select flights and hotels first.</p>
          <button
            onClick={() => navigate('/trip-planner')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Go to Trip Planner
          </button>
        </div>
      </div>
    );
  }

  const nNights = Math.max(1, nights(cart?.dates?.start, cart?.dates?.end));
  
  // Get currencies
  const flightCurrency = cart.selectedFlight?.currency || "USD";
  const hotelCurrency = cart.selectedHotel?.currency || "USD";
  
  // Simple conversion rates (you can make this dynamic later)
  const conversionRates = {
    'INR': { 'EUR': 0.011, 'USD': 0.012, 'INR': 1 },
    'EUR': { 'INR': 90, 'USD': 1.1, 'EUR': 1 },
    'USD': { 'INR': 83, 'EUR': 0.91, 'USD': 1 }
  };
  
  // Decide display currency (prefer EUR if either is EUR, else use flight currency)
  const displayCurrency = (flightCurrency === 'EUR' || hotelCurrency === 'EUR') ? 'EUR' : flightCurrency;
  
  // Convert prices to display currency
  const flightPrice = Number(cart.selectedFlight?.price || 0);
  const hotelPricePerNight = Number(cart.selectedHotel?.price || 0);
  
  const flightInDisplayCurrency = flightPrice * (conversionRates[flightCurrency]?.[displayCurrency] || 1);
  const hotelPerNightInDisplayCurrency = hotelPricePerNight * (conversionRates[hotelCurrency]?.[displayCurrency] || 1);
  const hotelTotal = hotelPerNightInDisplayCurrency * nNights;
  
  // Estimate daily expenses (food, transport, activities)
  const estimatedDailyExpense = displayCurrency === 'EUR' ? 80 : displayCurrency === 'INR' ? 5000 : 100;
  const planCost = estimatedDailyExpense * nNights;
  
  const total = flightInDisplayCurrency + hotelTotal + planCost;
  
  const currency = displayCurrency;

  async function saveTour() {
    if (saving) return; // Prevent duplicate saves
    
    const token = localStorage.getItem('auth_token');
    
    // Check if user is logged in
    if (!token) {
      const shouldLogin = window.confirm('You need to login to save trips. Would you like to login now?');
      if (shouldLogin) {
        navigate('/login');
      }
      return;
    }
    
    setSaving(true);
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const payload = {
        origin: cart.origin,
        destination: cart.destination,
        dates: cart.dates,
        budget: cart.budget,
        adults: cart.adults,
        interests: [],
        plan: {
          trip: { origin: cart.origin, destination: cart.destination, dates: cart.dates, budget: cart.budget },
          options: [{ label: "Manual selection", estTotal: total, flight: cart.selectedFlight, hotel: cart.selectedHotel }]
        }
      };
      
      const res = await fetch('/api/trips', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          alert('Your session has expired. Please login again.');
          navigate('/login');
          return;
        }
        throw new Error(data.message || 'Save failed');
      }
      
      // Clear cart after successful save
      clear();
      alert('Trip saved successfully!');
      navigate('/trips');
    } catch (e) {
      console.error('Save tour error:', e);
      alert(e.message || 'Failed to save tour. Please try again.');
      setSaving(false);
    }
  }

  async function generateItinerary() {
    setItLoading(true); setItError("");
    try {
      const duration = Math.max(1, nights(cart?.dates?.start, cart?.dates?.end));
      const body = {
        tripData: {
          destination: cart.destination,
          budget: cart.budget,
          interests: [],
          duration
        }
      };
      const r = await fetch('/api/ai/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      setItinerary(j?.recommendations || j?.data || j || null);
    } catch (e) {
      setItError(e?.message || 'Failed to generate');
    } finally {
      setItLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-0">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="relative px-4 sm:px-6 lg:px-8 py-10 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80">Finalize</div>
              <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{cart.origin || '—'} → {cart.destination || '—'}</h1>
              <p className="text-white/90 mt-1">{cart?.dates?.start || '—'} → {cart?.dates?.end || '—'} · {cart.adults || 1} {cart.adults === 1 ? 'adult' : 'adults'}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/80">Total</div>
              <div className="text-3xl font-extrabold">{fmt(total, currency)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      {/* <Stepper current="finalize" /> */}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-2">Flight</h2>
            {cart.selectedFlight ? (
              <div className="text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">✈️</span>
                    <span>{cart.selectedFlight.airline || 'Airline'} {cart.selectedFlight.gate || ''}</span>
                  </div>
                  <div className="font-semibold">{fmt(cart.selectedFlight.price, cart.selectedFlight.currency || currency)}</div>
                </div>
                <div className="text-neutral-500 mt-1">{cart.selectedFlight.from_iata || cart.selectedFlight.from} → {cart.selectedFlight.to_iata || cart.selectedFlight.to}</div>
                <div className="text-neutral-500">{cart.selectedFlight.depart_time || '—:—'} · {cart.selectedFlight.arrive_time || '—:—'} · {cart.selectedFlight.transfers === 0 ? 'Direct' : `${cart.selectedFlight.transfers}+ stops`}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">No flight selected</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-2">Hotel</h2>
            {cart.selectedHotel ? (
              <div className="text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">🏨</span>
                    <span>{cart.selectedHotel?.hotel?.name || 'Hotel'}</span>
                  </div>
                  <div className="font-semibold">{fmt(cart.selectedHotel.price, cart.selectedHotel.currency || currency)} / night</div>
                </div>
                <div className="text-neutral-500">{cart.selectedHotel?.city?.label || cart.selectedHotel?.hotel?.address?.cityName || ''} • {nNights} night{nNights===1?'':'s'}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">No hotel selected</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Plan details</h2>
              {!Array.isArray(itinerary) && (
                <button onClick={generateItinerary} disabled={itLoading} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
                  {itLoading ? 'Generating…' : 'Generate itinerary'}
                </button>
              )}
            </div>
            {itError && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-2">{itError}</div>}
            {!itinerary && !itLoading && (
              <div className="text-sm text-neutral-600">No itinerary yet. Click "Generate itinerary" to fill a day-by-day plan.</div>
            )}
            {itLoading && <div className="text-sm text-neutral-600">Thinking…</div>}
            {Array.isArray(itinerary) && itinerary.length > 0 && (
              <div className="space-y-3">
                {itinerary.map((day, idx) => (
                  <div key={idx} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="text-sm font-medium">{day.date || `Day ${idx + 1}`}</div>
                    <ul className="mt-1 text-sm list-disc pl-5">
                      {(day.blocks || day.activities || []).map((b, i) => {
                        if (typeof b === 'string') return <li key={i}>{b}</li>;
                        if (typeof b === 'object' && b !== null) {
                          const time = b.time || '';
                          const title = b.title || b.name || b.activity || b.notes || 'Activity';
                          return <li key={i}>{time ? `${time} — ` : ''}{title}</li>;
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-2">Summary</h2>
            <div className="text-sm text-neutral-700 space-y-1">
              <div className="flex justify-between">
                <span>Flight</span>
                <div className="text-right">
                  <div>{fmt(flightInDisplayCurrency, currency)}</div>
                  {flightCurrency !== currency && (
                    <div className="text-xs text-neutral-500">{fmt(flightPrice, flightCurrency)}</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Hotel ({nNights} night{nNights===1?'':'s'} × {fmt(hotelPerNightInDisplayCurrency, currency)})</span>
                <div className="text-right">
                  <div>{fmt(hotelTotal, currency)}</div>
                  {hotelCurrency !== currency && (
                    <div className="text-xs text-neutral-500">{nNights} × {fmt(hotelPricePerNight, hotelCurrency)}</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Daily expenses ({nNights} day{nNights===1?'':'s'} × {fmt(estimatedDailyExpense, currency)})</span>
                <div className="text-right">
                  <div>{fmt(planCost, currency)}</div>
                  <div className="text-xs text-neutral-500">Food, transport, activities</div>
                </div>
              </div>
              <div className="mt-2 border-t pt-2 flex justify-between font-semibold text-base"><span>Total</span><span>{fmt(total, currency)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowMultiAgent(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition flex items-center gap-2"
        >
          <span>🤖</span>
          <span>AI Agent Analysis</span>
        </button>
        <button
          onClick={saveTour}
          disabled={!isReadyToFinalize() || saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Tour'}
        </button>
        <button
          onClick={() => { clear(); navigate('/trip-planner'); }}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white"
        >
          Start Over
        </button>
      </div>

      {showMultiAgent && (
        <MultiAgentAnalysis
          tripData={{
            destination: cart.destination,
            budget: cart.budget || 5000, // Default $5,000 USD
            duration: nNights + 1,
            dates: cart.dates,
            interests: cart.interests || [],
            flightPrice: cart.selectedFlight?.price || 0,
            hotelPrice: (cart.selectedHotel?.price || 0) * nNights
          }}
          onClose={() => setShowMultiAgent(false)}
        />
      )}
    </div>
  );
}

function nights(a, b) {
  try {
    const A = new Date(a + 'T00:00:00');
    const B = new Date(b + 'T00:00:00');
    return Math.max(0, Math.round((B - A) / 86400000));
  } catch { return 0; }
}


