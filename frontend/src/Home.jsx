// src/Home.jsx
import { useNavigate } from "react-router-dom";

/**
 * HOME (modern, focused)
 * - Hero (bold promise + primary CTAs)
 * - Features (why Voyage AI)
 * - Trending Destinations (curated cards)
 * - Newsletter
 */
export default function Home() {
  return (
    <main className="bg-neutral-50 text-neutral-900">
      <Hero />
      <Signals />
      <HowItWorks />
      <PopularDestinations />
      <Newsletter />
    </main>
  );
}

/* ---------------------- Hero ---------------------- */
function Hero() {
  const nav = useNavigate();
  return (
    <section className="relative">
      <div className="relative max-w-7xl mx-auto mt-6 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="relative h-[520px] grid">
          <div className="absolute inset-0 opacity-[.12] bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="relative z-10 h-full w-full grid place-items-center">
            <div className="max-w-4xl text-center px-6">
              <h1 className="text-white text-5xl md:text-6xl font-extrabold leading-[1.05]">
                Plan smarter. Travel better.
              </h1>
              <p className="text-white/90 mt-5 max-w-2xl">
                AI-crafted trips, real-time prices, and seamless booking — all in one place.
              </p>
              <div className="mt-7">
                <a
                  href="/trip-planner"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-100"
                >
                  Start with AI Planner <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- Trending Destinations -------------- */
// Legacy embedded search components removed from Home for clarity

// (Old sections removed from home for clarity)
/* ---------------------- Signals -------------------- */
function Signals() {
  const cards = [
    { title: "Best months", value: "Mar–Apr", sub: "Dry & sunny, moderate crowds" },
    { title: "Visa friction", value: "eVisa", sub: "Avg 48–72h processing" },
    { title: "Avg return fare", value: "₹13.8k", sub: "Cheapest on Tue/Wed" },
    { title: "Crowd forecast", value: "Low–Med", sub: "Avoid long weekend 22–24" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <h2 className="text-xl font-semibold mb-3">Trip signals</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">{c.title}</div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
            <div className="text-sm text-neutral-600 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------- How It Works ------------------ */
function HowItWorks() {
  const steps = [
    { t: "Tell us the basics", d: "Route, dates, budget & vibe." },
    { t: "We compare & suggest", d: "Prices, timing, and the best months." },
    { t: "You book with confidence", d: "Clear options and no hidden fees." },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <h2 className="text-xl font-semibold mb-3">How it works</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5">
            <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white grid place-items-center text-sm font-bold">
              {i + 1}
            </div>
            <div className="mt-3 font-semibold">{s.t}</div>
            <div className="text-sm text-neutral-600 mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Popular Destinations -------------- */
function PopularDestinations() {
  const nav = useNavigate();
  const DATA = [
    {
      slug: "goa",
      city: "Goa",
      country: "India",
      img: "https://images.unsplash.com/photo-1589307004173-3c95204b4dfd?q=80&w=1200&auto=format&fit=crop",
      fromPrice: 4700,
      bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    },
    {
      slug: "bali",
      city: "Bali",
      country: "Indonesia",
      img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
      fromPrice: 19000,
      bestMonths: ["Apr", "May", "Jun", "Sep"],
    },
    {
      slug: "london",
      city: "London",
      country: "United Kingdom",
      img: "https://images.unsplash.com/photo-1465066282946-116652a30f9a?q=80&w=1200&auto=format&fit=crop",
      fromPrice: 42000,
      bestMonths: ["May", "Jun", "Sep"],
    },
  ];
  return (
    <section id="popular" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Popular destinations</h2>
        <button onClick={() => nav("/destinations")} className="text-sm underline">
          View all
        </button>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {DATA.map((d) => (
          <button
            key={d.slug}
            onClick={() => nav(`/destinations/${d.slug}`)}
            className="text-left block group rounded-2xl overflow-hidden bg-white border hover:shadow-lg"
          >
            <img
              src={d.img}
              alt={`${d.city}, ${d.country}`}
              className="h-48 w-full object-cover bg-neutral-200"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                const city = (d.city || 'travel');
                // First try Unsplash by city, then fallback to Picsum
                if (!img.dataset.fallback) {
                  img.dataset.fallback = 'unsplash';
                  img.src = `https://source.unsplash.com/800x400/?${encodeURIComponent(city)}`;
                } else if (img.dataset.fallback === 'unsplash') {
                  img.dataset.fallback = 'picsum';
                  img.src = `https://picsum.photos/800/400?random=${Math.floor(Math.random()*1000)}`;
                }
              }}
            />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  {d.city}, {d.country}
                </div>
                <div className="text-sm bg-neutral-900 text-white px-2 py-1 rounded-md">
                  from ₹{(d.fromPrice ?? 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-600">Best months: {d.bestMonths.join(" • ")}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------------- Newsletter ------------------ */
function Newsletter() {
  return (
    <section id="newsletter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 mb-16">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-2xl font-bold">Get fare drops & travel hacks</h3>
            <p className="text-white/90 mt-1">One email a week. No spam.</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@example.com" className="flex-1 h-11 rounded-xl px-3 text-neutral-900 outline-none" />
            <button className="h-11 px-5 rounded-xl bg-white text-neutral-900 font-medium">Subscribe</button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ------------------- Small helpers ------------------ */
// Removed legacy helper form components
