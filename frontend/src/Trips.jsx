import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import storage from "./lib/storage.js";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Fallback to localStorage if not logged in
        setTrips(storage.getSavedTrips());
        return;
      }
      
      const res = await fetch('/api/trips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTrips(data.data || []);
      } else {
        // Fallback to localStorage
        setTrips(storage.getSavedTrips());
      }
    } catch (err) {
      console.error('Failed to fetch trips:', err);
      setTrips(storage.getSavedTrips());
    }
  }

  function getImageUrl(destination) {
    // Use a deterministic seed based on destination name for consistent images
    const seed = destination.toLowerCase().replace(/\s+/g, '-');
    return `https://picsum.photos/seed/${seed}/800/400`;
  }

  function refresh() {
    fetchTrips();
  }

  function useTrip(trip) {
    const seed = buildSeedMessage(trip);
    storage.saveTripForm({
      origin: trip.origin,
      destination: trip.destination,
      start: trip.dates?.start,
      end: trip.dates?.end,
      budget: trip.budget,
      adults: trip.adults,
      interests: trip.interests || []
    });
    navigate("/trip-planner", { state: { seedMessage: seed, autoSeed: true } });
  }

  async function deleteTrip(id) {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`/api/trips/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        storage.removeSavedTrip(id);
      }
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete trip');
    }
  }

  function duplicateTrip(trip) {
    const copy = { ...trip, id: Date.now().toString(), savedAt: Date.now() };
    storage.saveTrip(copy);
    refresh();
  }

  function getStatus(trip) {
    if (!trip.dates?.start) return "draft";
    const start = new Date(trip.dates.start);
    const now = new Date();
    return start > now ? "upcoming" : "past";
  }

  const stats = {
    total: trips.length,
    upcoming: trips.filter(t => getStatus(t) === "upcoming").length,
    past: trips.filter(t => getStatus(t) === "past").length,
  };

  // AI Recommendations based on saved trips
  const recommendations = getRecommendations(trips);

  function shareTrip(trip) {
    const shareUrl = `${window.location.origin}/shared-trip/${trip.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied! Anyone with this link can view your trip.');
  }

  function enablePriceAlert(trip) {
    // Store trip for price monitoring
    const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
    if (!alerts.find(a => a.tripId === trip.id)) {
      alerts.push({
        tripId: trip.id,
        route: `${trip.origin}-${trip.destination}`,
        dates: trip.dates,
        enabled: true,
        createdAt: Date.now()
      });
      localStorage.setItem('priceAlerts', JSON.stringify(alerts));
      alert('✅ Price alert enabled! We\'ll notify you when prices drop.');
    } else {
      alert('Price alert already enabled for this trip.');
    }
  }

  if (!trips.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">My Trips</h1>
        <p className="text-slate-600">No trips saved yet. Plan a trip and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">My Trips</h1>
          <p className="text-slate-600">Revisit and reuse your planned journeys</p>
          <div className="flex gap-3 mt-2 text-sm">
            <span className="text-neutral-600">Total: <b>{stats.total}</b></span>
            <span className="text-green-600">Upcoming: <b>{stats.upcoming}</b></span>
            <span className="text-neutral-500">Past: <b>{stats.past}</b></span>
          </div>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:shadow"
        >
          Refresh
        </button>
      </div>

      {/* AI Recommendations - Featured Section */}
      {recommendations.length > 0 && (
        <div className="mb-12 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 border border-indigo-100 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xl">✨</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Recommendations</h2>
              <p className="text-slate-600 text-sm">Personalized destinations based on your travel style</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mt-6">
            {recommendations.map((rec, i) => (
              <div key={i} className="group rounded-2xl border-2 border-white bg-white/80 backdrop-blur p-5 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎯</span>
                  <div className="text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    {rec.reason}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{rec.destination}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{rec.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/trip-planner?destination=${rec.destination}`)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
                  >
                    Plan Trip →
                  </button>
                  <button
                    onClick={() => navigate(`/destinations?q=${rec.destination}`)}
                    className="px-4 py-2.5 rounded-xl border-2 border-indigo-200 bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition"
                  >
                    Explore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Your Saved Trips</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {trips.map((t) => {
          const status = getStatus(t);
          return (
          <article key={t.id} className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
            {/* Hero image */}
            <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-purple-100">
              <img
                src={getImageUrl(t.destination)}
                alt={t.destination}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute left-4 top-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  status === 'upcoming' ? 'bg-green-500 text-white' :
                  status === 'past' ? 'bg-neutral-400 text-white' :
                  'bg-yellow-500 text-neutral-900'
                }`}>
                  {status === 'upcoming' ? 'Upcoming' : status === 'past' ? 'Past' : 'Draft'}
                </span>
              </div>
              <div className="absolute left-4 bottom-3 text-white drop-shadow pointer-events-none">
                <div className="text-xs font-bold px-2 py-1 rounded bg-black/50 inline-block border border-white/20">
                  {t.destination}
                </div>
                <h3 className="text-xl font-semibold mt-1">{t.origin} → {t.destination}</h3>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              <p className="text-slate-600 text-sm">
                {t.dates?.start} → {t.dates?.end} • {t.adults} {t.adults === 1 ? "adult" : "adults"} • ${t.budget}
              </p>
              {Array.isArray(t.interests) && t.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.interests.slice(0, 6).map((i) => (
                    <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {i}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => useTrip(t)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium shadow hover:shadow-md"
                >
                  Use This Plan
                </button>
                <button
                  onClick={() => navigate(`/flights?from=${t.origin}&to=${t.destination}&date=${t.dates?.start || ''}&adults=${t.adults || 1}`)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm hover:bg-neutral-50"
                >
                  Book Flights
                </button>
                <button
                  onClick={() => navigate(`/hotels?city=${t.destination}&checkIn=${t.dates?.start || ''}&checkOut=${t.dates?.end || ''}&guests=${t.adults || 2}`)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm hover:bg-neutral-50"
                >
                  Find Hotels
                </button>
                <button
                  onClick={() => duplicateTrip(t)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm hover:bg-neutral-50"
                  title="Duplicate trip"
                >
                  📋
                </button>
                <button
                  onClick={() => shareTrip(t)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm hover:bg-neutral-50"
                  title="Share trip"
                >
                  🔗
                </button>
                <button
                  onClick={() => enablePriceAlert(t)}
                  className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm hover:bg-amber-100"
                  title="Enable price alerts"
                >
                  🔔
                </button>
                <button
                  onClick={() => deleteTrip(t.id)}
                  className="px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-sm hover:bg-rose-100"
                >
                  Delete
                </button>
                <span className="ml-auto text-xs text-slate-500">Saved {new Date(t.savedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </article>
        );
        })}
      </div>

    </div>
  );
}

function buildSeedMessage(trip) {
  const parts = [];
  if (trip.origin && trip.destination) parts.push(`Plan ${trip.origin} to ${trip.destination}`);
  if (trip.dates?.start && trip.dates?.end) parts.push(`for ${trip.dates.start} to ${trip.dates.end}`);
  if (trip.budget) parts.push(`budget $${trip.budget}`);
  if (trip.adults) parts.push(`${trip.adults} ${trip.adults === 1 ? 'adult' : 'adults'}`);
  if (Array.isArray(trip.interests) && trip.interests.length) parts.push(`interests ${trip.interests.join(', ')}`);
  return parts.join(', ');
}

function getRecommendations(trips) {
  if (!trips.length) return [];
  
  // Analyze user preferences
  const allInterests = trips.flatMap(t => t.interests || []);
  const interestCounts = {};
  allInterests.forEach(i => { interestCounts[i] = (interestCounts[i] || 0) + 1; });
  const topInterest = Object.keys(interestCounts).sort((a, b) => interestCounts[b] - interestCounts[a])[0];
  
  const destinations = trips.map(t => t.destination);
  
  // Smart recommendations database
  const recDb = {
    'PER': [{ dest: 'LIM', reason: 'Similar to Peru', desc: 'Lima offers rich culture and cuisine like Peru' }],
    'SYD': [{ dest: 'MEL', reason: 'Also in Australia', desc: 'Melbourne has great culture and coffee scene' }],
    'CDG': [{ dest: 'AMS', reason: 'Similar to Paris', desc: 'Amsterdam offers art, canals, and European charm' }],
    'DEL': [{ dest: 'BOM', reason: 'Also in India', desc: 'Mumbai has vibrant culture and coastal beauty' }],
  };
  
  const recs = [];
  
  // Based on visited destinations
  for (const dest of destinations.slice(0, 2)) {
    if (recDb[dest]) {
      recs.push({ destination: recDb[dest][0].dest, reason: recDb[dest][0].reason, description: recDb[dest][0].desc });
    }
  }
  
  // Based on interests
  if (topInterest === 'Culture') {
    recs.push({ destination: 'Rome', reason: 'For culture lovers', description: 'Ancient history, art, and architecture' });
  } else if (topInterest === 'Food') {
    recs.push({ destination: 'Tokyo', reason: 'For food enthusiasts', description: 'World-class cuisine and street food' });
  } else if (topInterest === 'Beach') {
    recs.push({ destination: 'Bali', reason: 'Beach paradise', description: 'Stunning beaches and island vibes' });
  }
  
  // Generic fallback
  if (!recs.length) {
    recs.push(
      { destination: 'Barcelona', reason: 'Popular choice', description: 'Art, beaches, and vibrant nightlife' },
      { destination: 'Dubai', reason: 'Trending destination', description: 'Luxury, shopping, and modern architecture' }
    );
  }
  
  return recs.slice(0, 3);
}
