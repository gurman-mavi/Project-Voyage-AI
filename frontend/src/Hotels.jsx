import { useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "./contexts/NotificationContext.jsx";
import { useNavigate } from "react-router-dom";
import { useTripCart } from "./contexts/TripCartContext.jsx";

const API_BASE = "http://localhost:5050";
const daysFromToday = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// Seeded placeholder (unique & stable per hotel when no real photo)
const seededPlaceholder = (seed) =>
  `https://picsum.photos/seed/${encodeURIComponent(String(seed || "hotel"))}/1200/800`;


const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1501117716987-c8e1ecb210d1?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop",
];

function pickHotelImage(item) {
  const h = item?.hotel || item || {};
  const raw =
    h?.image ||
    h?.imageUrl ||
    h?.image_url ||
    (Array.isArray(h?.images) && h.images[0]) ||
    (Array.isArray(h?.photos) && (h.photos[0]?.url || h.photos[0])) ||
    h?.photo ||
    h?.photoUrl ||
    h?.media?.[0]?.url ||
    (Array.isArray(item?.images) && item.images[0]) ||
    (Array.isArray(item?.photos) && (item.photos[0]?.url || item.photos[0])) ||
    null;

  if (!raw || typeof raw !== "string") return null;

  // Ensure the URL is properly formatted
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  
  // If it's a relative URL, make it absolute
  if (raw.startsWith('/')) {
    return `${API_BASE}${raw}`;
  }
  
  // If it's just a filename or path, prepend the API base
  return `${API_BASE}/${raw}`;
}


function StarRow({ rating }) {
  const r = Number(rating || 0);
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return (
    <span aria-label={`${r} stars`} title={`${r}★`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
    </span>
  );
}
const offerPrice = (o) =>
  isFinite(Number(o?.price?.total)) ? Number(o.price.total) : Infinity;

function fmtCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(Number(amount) || 0).toLocaleString()}`;
  }
}
function passesStarFilter(rating, minStars) {
  const r = Number(rating || 0);
  if (minStars === 0) return true;
  if (!r) return false;
  return r >= minStars;
}

/* --------------------- City / Airport typeahead ------------------- */
function CitySearch({ placeholder, onPick, initial, onTextChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (initial?.label) setQuery(initial.label);
    else if (initial?.code) setQuery(initial.code);
  }, [initial]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function fetchCities(q) {
    if (q.length < 2) { setItems([]); return; }
    try {
      const url = `${API_BASE}/api/cities?q=${encodeURIComponent(q)}&limit=12`;
      const res = await fetch(url);
      const json = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
      setOpen(true);
      setHi(-1);
    } catch {
      setItems([]);
    }
  }

  function debounce(q) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchCities(q), 220);
  }

  function pick(it) {
    const label = it.display || it.name;
    setQuery(label);
    setOpen(false);
    onTextChange?.(label);
    onPick?.({ code: it.code, label, lat: it.lat, lon: it.lon, subType: it.subType });
  }

  function onKeyDown(e) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => (p + 1) % items.length); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHi((p) => (p - 1 + items.length) % items.length); }
    if (e.key === "Enter" && hi >= 0) { e.preventDefault(); pick(items[hi]); }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        className="hotel-input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          const q = e.target.value;
          setQuery(q);
          onTextChange?.(q);
          debounce(q);
        }}
        onFocus={() => { if (items.length) setOpen(true); }}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "0 0 10px 10px",
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 20,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {items.length === 0 ? (
            <li style={{ padding: "10px 12px", color: "#666" }}>No matches</li>
          ) : items.map((it, idx) => (
            <li
              key={it.code + idx}
              onClick={() => pick(it)}
              onMouseEnter={() => setHi(idx)}
              style={{
                padding: "12px 12px",
                cursor: "pointer",
                background: idx === hi ? "#f0f8ff" : "#fff",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, color: "#111", fontSize: 15 }}>
                  {it.display || it.name}
                </span>
                <span style={{ fontSize: 13, color: "#444" }}>
                  {it.subType === "AIRPORT" ? "Airport" : "City"}
                </span>
              </div>

              <span
                style={{
                  fontSize: 13,
                  color: "#fff",
                  background: "#0071c2",
                  border: "1px solid #005a99",
                  padding: "3px 8px",
                  borderRadius: 6,
                  minWidth: 42,
                  textAlign: "center",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {it.code}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ===== Hotel Booking Flow Component ===== */
function HotelBookingFlow({ selectedHotel, onClose, onProceed, chosen }) {
  if (!selectedHotel) return null;

  const h = selectedHotel?.hotel || {};
  const name = h?.name || "Hotel";
  const rating = h?.rating || null;
  const cityName = h?.address?.cityName || selectedHotel?.city?.label || selectedHotel?.city?.code;
  const addr = h?.address?.lines?.[0] || "";
  const cheapest = selectedHotel?._cheapest || (Array.isArray(selectedHotel?.offers) ? selectedHotel.offers[0] : null);
  const price = offerPrice(cheapest);
  const currency = cheapest?.price?.currency || "EUR";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Hotel Details</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}>×</button>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {/* Hotel Summary */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <img
                src={pickHotelImage(selectedHotel) || seededPlaceholder(h?.name || h?.hotelId || "hotel")}
                alt={name}
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                onError={(e) => { e.currentTarget.src = seededPlaceholder((h?.name || h?.hotelId || "hotel") + "-alt"); }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{name}</h3>
                  {rating ? <span style={{ fontSize: 12, color: "#555" }}><StarRow rating={rating} /></span> : null}
                </div>
                <div style={{ fontSize: 14, color: "#555" }}>
                  {cityName}{addr ? ` • ${addr}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{isFinite(price) ? fmtCurrency(price, currency) : "—"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>per night</div>
              </div>
            </div>
          </div>

          {/* Booking Options */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>What would you like to do?</h3>
            
            <div style={{ display: "grid", gap: 12 }}>
              <button
                onClick={() => onProceed('book')}
                style={{ width: "100%", padding: 16, border: "1px solid #0071c2", background: "#e6f3ff", color: "#0071c2", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontWeight: 600 }}>Book this hotel</div>
                <div style={{ fontSize: 14 }}>Complete your booking with payment</div>
              </button>
              
              <button
                onClick={() => onProceed('save')}
                style={{ width: "100%", padding: 16, border: "1px solid #ddd", background: "#f9f9f9", color: "#333", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontWeight: 600 }}>Save for later</div>
                <div style={{ fontSize: 14 }}>Add to your saved hotels</div>
              </button>
              
              <button
                onClick={() => onProceed('share')}
                style={{ width: "100%", padding: 16, border: "1px solid #ddd", background: "#f9f9f9", color: "#333", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontWeight: 600 }}>Share hotel details</div>
                <div style={{ fontSize: 14 }}>Send details to travel companions</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */
function Hotels() {
  const { showSuccess, showError, showInfo } = useNotifications();
  const navigate = useNavigate();
  const { selectHotel } = useTripCart();
  const [activeTab, setActiveTab] = useState("hotels");

  // City state + raw text
  const [city, setCity] = useState({ code: "DEL", lat: null, lon: null, label: "DEL" });
  const [cityText, setCityText] = useState("DEL");

  // Hotels
  const [checkInDate, setCheckInDate] = useState(daysFromToday(10));
  const [checkOutDate, setCheckOutDate] = useState(daysFromToday(12));
  const [adults, setAdults] = useState(2);

  // Flights
  const [flyFrom, setFlyFrom] = useState({ code: "DEL", label: "DEL" });
  const [flyTo,   setFlyTo]   = useState({ code: "ATQ", label: "ATQ" });
  const [departDate, setDepartDate] = useState(daysFromToday(10));
  const [returnDate, setReturnDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [flightResults, setFlightResults] = useState(null);
  const [error, setError] = useState("");
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showHotelBooking, setShowHotelBooking] = useState(false);
  const [chosen, setChosen] = useState(null);

  const [sortBy, setSortBy] = useState("recommended");
  const [minStars, setMinStars] = useState(0);
  const [onlyRefundable, setOnlyRefundable] = useState(false);
  const [includeBreakfast, setIncludeBreakfast] = useState(false);
  const [priceCap, setPriceCap] = useState(null);

  const hotelsRaw = useMemo(
    () => {
      // Handle both direct data array and nested data structure
      const hotelsData = results?.data?.data || results?.data || [];
      return Array.isArray(hotelsData) ? hotelsData : [];
    },
    [results]
  );

  const statsBaseOffers = useMemo(() => {
    const out = [];
    for (const h of hotelsRaw) {
      const rating = h?.hotel?.rating;
      if (!passesStarFilter(rating, minStars)) continue;
      const offers = Array.isArray(h?.offers) ? h.offers : [];
      for (const o of offers) {
        if (onlyRefundable && !o?.policies?.refundable?.cancellationRefund) continue;
        if (includeBreakfast && !String(o?.boardType || "").toUpperCase().includes("BREAKFAST")) continue;
        const p = offerPrice(o);
        if (!isFinite(p)) continue;
        out.push({ price: p, currency: o?.price?.currency || "USD" });
      }
    }
    return out;
  }, [hotelsRaw, minStars, onlyRefundable, includeBreakfast]);

  const statsCurrency = useMemo(() => {
    if (!statsBaseOffers.length) return "USD";
    const counts = statsBaseOffers.reduce((m, o) => {
      m[o.currency] = (m[o.currency] || 0) + 1;
      return m;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [statsBaseOffers]);

  const priceStats = useMemo(() => {
    if (!statsBaseOffers.length) return { min: 0, max: 0, has: false, currency: "USD" };
    const prices = statsBaseOffers.map((o) => o.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
      has: true,
      currency: statsCurrency,
    };
  }, [statsBaseOffers, statsCurrency]);

  const nearestIn = results?.data?.[0]?.offers?.[0]?.checkInDate || null;
  const nearestOut = results?.data?.[0]?.offers?.[0]?.checkOutDate || null;
  const nearestDifferent =
    Boolean(results?.usedNearestDates) ||
    (nearestIn && nearestOut && (nearestIn !== checkInDate || nearestOut !== checkOutDate));
  const applyNearestDates = () => {
    if (nearestIn && nearestOut) {
      setCheckInDate(nearestIn);
      setCheckOutDate(nearestOut);
      runHotelSearch();
    }
  };

  async function resolveCityText(rawText) {
    const t = String(rawText || "").trim();
    if (!t) return null;

    if (/^[A-Za-z]{3}$/.test(t)) {
      const code = t.toUpperCase();
      try {
        const r = await fetch(`${API_BASE}/api/cities?q=${code}&limit=1&hasHotels=1`);
        const j = await r.json();
        const best = j?.data?.[0];
        if (best) return { code: best.code, lat: best.lat, lon: best.lon, label: `${best.name}, ${best.country}` };
        return null;
      } catch { return null; }
    }

    try {
      const r = await fetch(`${API_BASE}/api/cities?q=${encodeURIComponent(t)}&limit=1&hasHotels=1`);
      const j = await r.json();
      const best = j?.data?.[0];
      if (!best) return null;
      return { code: best.code, lat: best.lat, lon: best.lon, label: `${best.name}, ${best.country}` };
    } catch { return null; }
  }

  async function runHotelSearch() {
    setError(""); setSelectedOffer(null); setResults(null);

    let currentChosen = city;
    if (!currentChosen?.code || !currentChosen?.label || (cityText && !city?.label?.toLowerCase().includes(cityText.toLowerCase()))) {
      const resolved = await resolveCityText(cityText);
      if (resolved) {
        setCity(resolved);
        currentChosen = resolved;
        setChosen(resolved);
      } else {
        setError("Please choose a city from the list (only cities with hotels are shown).");
        return;
      }
    } else {
      setChosen(currentChosen);
    }

    try {
      if (!currentChosen?.code || !checkInDate || !checkOutDate) {
        setError("Please select a city and both dates.");
        return;
      }
      setLoading(true);
      const qs = new URLSearchParams({
        cityCode: currentChosen.code.toUpperCase().trim(),
        checkInDate, checkOutDate,
        adults: String(adults || 1),
        strictCity: "1",
        ...(currentChosen.lat && currentChosen.lon ? { lat: String(currentChosen.lat), lon: String(currentChosen.lon) } : {})
      }).toString();
      
      console.log(`🔍 Searching hotels: ${API_BASE}/api/hotels/search?${qs}`);
      const res = await fetch(`${API_BASE}/api/hotels/search?${qs}`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error("Expected JSON but got HTML/text.\n" + text.slice(0, 200));
      }
      
      const json = await res.json();
      console.log("🏨 Hotel search results:", json);
      setResults(json);

      // Handle both direct data array and nested data structure
      const hotelsData = json?.data?.data || json?.data || [];
      const all = Array.isArray(hotelsData) 
        ? hotelsData.flatMap((h) => (h?.offers || []).map(offerPrice))
        : [];
      const validPrices = all.filter(Number.isFinite);
      if (validPrices.length) setPriceCap(Math.ceil(Math.max(...validPrices)));

      if (!Array.isArray(hotelsData) || !hotelsData.length) {
        setError(`No hotels found in ${currentChosen?.label || currentChosen.code} for these dates. Try different dates or a nearby city.`);
      }
    } catch (e) {
      console.error("❌ Hotel search error:", e);
      setError(e.message || "Hotel search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function runFlightSearch() {
    setError(""); setFlightResults(null);
    try {
      if (!flyFrom?.code || !flyTo?.code || !departDate) {
        setError("Enter origin, destination and departure date.");
        return;
      }
      setLoading(true);
      const qs = new URLSearchParams({
        originLocationCode: flyFrom.code.toUpperCase().trim(),
        destinationLocationCode: flyTo.code.toUpperCase().trim(),
        departureDate: departDate,
        returnDate,
        adults: String(adults || 1),
      }).toString();
      const res = await fetch(`${API_BASE}/api/flights/search?${qs}`);
      const json = await res.json();
      setFlightResults(json);
      if (!json?.ok || !(json?.data || []).length) {
        setError("No flights found for these dates/route.");
      }
    } catch (e) {
      setError(e.message || "flight_search_failed");
    } finally {
      setLoading(false);
    }
  }

  async function viewOffer(offerId) {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/hotels/offer/${offerId}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error("Expected JSON but got HTML/text for offer details.\n" + text.slice(0, 200));
      }
      const json = await res.json();
      setSelectedOffer(json.data?.offer || json.data || json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const trySamplePAR = () => {
    setCity({ code: "PAR", lat: 48.8566, lon: 2.3522, label: "Paris, France" });
    setCityText("Paris");
    setCheckInDate(daysFromToday(10));
    setCheckOutDate(daysFromToday(12));
  };

  // Hotel selection handlers
  const handleHotelSelect = (hotel) => {
    setSelectedHotel(hotel);
    setShowHotelBooking(true);
  };

  const handleHotelBookingProceed = (action) => {
    const h = selectedHotel?.hotel || {};
    const name = h?.name || "Hotel";
    const cheapest = selectedHotel?._cheapest || (Array.isArray(selectedHotel?.offers) ? selectedHotel.offers[0] : null);
    const price = offerPrice(cheapest);
    const currency = cheapest?.price?.currency || "EUR";

    switch (action) {
      case 'book': {
        // Save minimal hotel summary to the trip cart and proceed to Finalize
        const hotelSummary = {
          hotel: { name: name, rating: h?.rating || null, address: h?.address || {} },
          price: isFinite(price) ? price : 0,
          currency,
          city: selectedHotel?.city || { label: h?.address?.cityName || "" },
          offers: undefined, // reduce payload
        };
        try { selectHotel(hotelSummary); } catch {}
        navigate('/finalize');
        break;
      }
      case 'save': {
        const savedHotels = JSON.parse(localStorage.getItem('savedHotels') || '[]');
        savedHotels.push({
          ...selectedHotel,
          savedAt: new Date().toISOString()
        });
        localStorage.setItem('savedHotels', JSON.stringify(savedHotels));
        showSuccess('Hotel saved to your favorites!');
        break;
      }
      case 'share': {
        const shareText = `Check out this hotel: ${name} in ${h?.address?.cityName || "city"} for ${isFinite(price) ? fmtCurrency(price, currency) : "—"} per night`;
        navigator.clipboard.writeText(shareText);
        showSuccess('Hotel details copied to clipboard!');
        break;
      }
    }
    setShowHotelBooking(false);
    setSelectedHotel(null);
  };

  const handleCloseHotelBooking = () => {
    setShowHotelBooking(false);
    setSelectedHotel(null);
  };

  const filtered = useMemo(() => {
    const list = [];
    for (const h of hotelsRaw) {
      const rating = h?.hotel?.rating;
      if (!passesStarFilter(rating, minStars)) continue;

      const offers = Array.isArray(h?.offers) ? h.offers : [];
      const matching = offers.filter((o) => {
        if (onlyRefundable && !o?.policies?.refundable?.cancellationRefund) return false;
        if (includeBreakfast && !String(o?.boardType || "").toUpperCase().includes("BREAKFAST")) return false;
        const p = offerPrice(o);
        if (priceCap && isFinite(priceCap) && isFinite(p) && p > priceCap) return false;
        return true;
      });
      if (!matching.length) continue;

      const cheapest = matching.reduce((min, o) =>
        offerPrice(o) < offerPrice(min) ? o : min
      );
      list.push({ ...h, _cheapest: cheapest });
    }

    const sorted = [...list];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => offerPrice(a._cheapest) - offerPrice(b._cheapest));
    } else if (sortBy === "rating_desc") {
      sorted.sort((a, b) => Number(b?.hotel?.rating || 0) - Number(a?.hotel?.rating || 0));
    } else {
      sorted.sort(
        (a, b) =>
          Number(b?.hotel?.rating || 0) - Number(a?.hotel?.rating || 0) ||
          offerPrice(a._cheapest) - offerPrice(b._cheapest)
      );
    }
    return sorted;
  }, [hotelsRaw, minStars, onlyRefundable, includeBreakfast, priceCap, sortBy]);

  return (
    <div style={{ background: "#fff" }}>
      <style>{`
        .tabs { display:flex; gap:10px; }
        .tab, .tab-active {
          padding:8px 12px; border-radius:8px; border:1px solid #2b6cb0;
          background:#0035800f; color:#fff; cursor:pointer;
        }
        .tab-active { background:#0071c2; border-color:#0071c2; }
        .search-grid {
          display:grid; grid-template-columns: 2fr 1.2fr 1.2fr 1fr 0.8fr; gap:10px;
          background:#ffb700; padding:10px; border-radius:10px;
        }
        @media (max-width: 900px) { .search-grid { grid-template-columns: 1fr; } }
        .hotel-input {
          padding:14px 12px; border-radius:10px; border:1px solid #d0d7de;
          background:#fff; color:#111; font-size:16px; line-height:22px;
        }
        .search-btn {
          height:48px; background:#0071c2; color:#fff; font-weight:700;
          border-radius:10px; border:none; cursor:pointer;
        }
      `}</style>

      <div style={{ background: "#003580", color: "#fff", padding: "28px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Where to next?</h1>

          <div className="tabs" style={{ marginTop: 12 }}>
            <button className={activeTab === "hotels" ? "tab-active" : "tab"} onClick={() => setActiveTab("hotels")}>Hotels</button>
            <button className={activeTab === "flights" ? "tab-active" : "tab"} onClick={() => setActiveTab("flights")}>Flights</button>
            <button className={activeTab === "combo" ? "tab-active" : "tab"} onClick={() => setActiveTab("combo")}>Flights + Hotel</button>
          </div>

          {activeTab === "hotels" && (
            <div className="search-grid" style={{ marginTop: 16 }}>
              <CitySearch
                placeholder="Search city (only with hotels)…"
                initial={city}
                onTextChange={setCityText}
                onPick={(it) => { setCity(it); setCityText(it.label); }}
              />
              <input className="hotel-input" type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
              <input className="hotel-input" type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
              <input className="hotel-input" type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value || 1))} placeholder="Guests" />
              <button className="search-btn" onClick={runHotelSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
            </div>
          )}

          {activeTab === "flights" && (
            <div className="search-grid" style={{ marginTop: 16, gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 0.8fr" }}>
              <CitySearch placeholder="From (city with airport)" onPick={(it) => setFlyFrom({ code: it.code, label: it.label })} initial={flyFrom} onTextChange={() => {}} />
              <CitySearch placeholder="To (city with airport)"   onPick={(it) => setFlyTo({ code: it.code, label: it.label })}   initial={flyTo}   onTextChange={() => {}} />
              <input className="hotel-input" type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
              <input className="hotel-input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} placeholder="Return (optional)" />
              <button className="search-btn" onClick={runFlightSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
            </div>
          )}

          {activeTab === "combo" && (
            <div className="search-grid" style={{ marginTop: 16, gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 0.8fr" }}>
              <CitySearch placeholder="Fly from" onPick={(it) => setFlyFrom({ code: it.code, label: it.label })} initial={flyFrom} onTextChange={() => {}} />
              <CitySearch placeholder="Destination city" onPick={(it) => { setFlyTo({ code: it.code, label: it.label }); setCity(it); setCityText(it.label); }} initial={city} onTextChange={setCityText} />
              <input className="hotel-input" type="date" value={departDate} onChange={(e) => { setDepartDate(e.target.value); setCheckInDate(e.target.value); }} />
              <input className="hotel-input" type="date" value={returnDate} onChange={(e) => { setReturnDate(e.target.value); setCheckOutDate(e.target.value); }} />
              <button className="search-btn" onClick={() => { runFlightSearch(); runHotelSearch(); }} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12 }}>
            <button onClick={trySamplePAR} style={{ fontSize: 12, color: "#fff", background: "transparent" }}>Try sample (PAR)</button>
            {" · "}
            <button onClick={() => setShowDebug((v) => !v)} style={{ fontSize: 12, color: "#fff", background: "transparent" }}>
              {showDebug ? "Hide debug" : "Show debug"}
            </button>
            {results?.via ? <> · via: <code>{results.via}</code></> : null}
          </div>
        </div>
      </div>

      {nearestDifferent && (
        <div style={{ maxWidth: 1200, margin: "12px auto 0", padding: 12, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Showing nearest available dates</div>
          <div style={{ fontSize: 14 }}>
            {nearestIn && nearestOut ? <>Nearest: <strong>{nearestIn}</strong> → <strong>{nearestOut}</strong></> : <>Inventory for your exact dates is limited; showing nearby availability.</>}
          </div>
          {nearestIn && nearestOut && <button onClick={applyNearestDates} style={{ marginTop: 8 }}>Use these dates</button>}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "12px auto 24px", padding: "0 16px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <aside style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, height: "fit-content" }}>
          <h3 style={{ margin: "4px 0 12px" }}>Filter by</h3>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Your budget (per stay)</div>
            {statsBaseOffers.length ? (
              <>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {fmtCurrency(Math.min(...statsBaseOffers.map(o=>o.price)), statsBaseOffers[0]?.currency || "USD")}
                  {" "}–{" "}
                  {fmtCurrency(Math.max(...statsBaseOffers.map(o=>o.price)), statsBaseOffers[0]?.currency || "USD")}
                </div>
                <input
                  type="range"
                  min={Math.floor(Math.min(...statsBaseOffers.map(o=>o.price)))}
                  max={Math.ceil(Math.max(...statsBaseOffers.map(o=>o.price)))}
                  value={priceCap ?? Math.ceil(Math.max(...statsBaseOffers.map(o=>o.price)))}
                  onChange={(e) => setPriceCap(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: 12, color: "#555" }}>
                  Max: <strong>{fmtCurrency(priceCap ?? Math.ceil(Math.max(...statsBaseOffers.map(o=>o.price))), statsBaseOffers[0]?.currency || "USD")}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>(Range reflects your current filters like stars/breakfast/cancellation)</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#888" }}>Run a search to set budget range</div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Popular filters</div>
            {[0, 3, 4, 5].map((s) => {
              const hasAny = hotelsRaw.some((h) => passesStarFilter(h?.hotel?.rating, s));
              return (
                <label key={s} style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0", fontSize: 14, opacity: hasAny ? 1 : 0.5 }}>
                  <input type="radio" name="stars" checked={minStars === s} onChange={() => setMinStars(s)} disabled={!hasAny} />
                  <span>{s === 0 ? "Any rating" : `${s}+ stars`}</span>
                </label>
              );
            })}
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0", fontSize: 14 }}>
              <input type="checkbox" checked={onlyRefundable} onChange={(e) => setOnlyRefundable(e.target.checked)} />
              <span>Free cancellation</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0", fontSize: 14 }}>
              <input type="checkbox" checked={includeBreakfast} onChange={(e) => setIncludeBreakfast(e.target.checked)} />
              <span>Breakfast included</span>
            </label>
          </div>
        </aside>

        <section>
          {(activeTab === "flights" || activeTab === "combo") && flightResults && (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Flights: {Array.isArray(flightResults?.data) ? flightResults.data.length : 0} options
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(flightResults?.data || []).slice(0, 5).map((fo, i) => {
                  const price = fo?.price?.total;
                  const cc = fo?.price?.currency;
                  const itin = fo?.itineraries?.[0];
                  const seg0 = itin?.segments?.[0];
                  const lastSeg = itin?.segments?.[itin?.segments?.length - 1];
                  return (
                    <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {seg0?.departure?.iataCode} → {lastSeg?.arrival?.iataCode}
                        </div>
                        <div style={{ fontSize: 12, color: "#555" }}>
                          {seg0?.carrierCode} • {itin?.segments?.length - 1 || 0} stop(s)
                        </div>
                      </div>
                      <div style={{ fontWeight: 800 }}>{price} {cc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>
              {filtered.length ? `${filtered.length} properties found` : results ? "No results" : ""}
            </div>
            <div>
              <label style={{ fontSize: 14, color: "#555", marginRight: 8 }} htmlFor="sort-select">Sort by:</label>
              <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 8px" }}>
                <option value="recommended">Our top picks</option>
                <option value="price_asc">Price (lowest first)</option>
                <option value="rating_desc">Rating (highest first)</option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</p>}
          {loading && <p>Loading…</p>}

          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((item, idx) => {
              const h = item?.hotel || {};
              const name = h?.name || "Hotel";
              const rating = h?.rating || null;
              const cityName = h?.address?.cityName || city?.label || city?.code;
              const addr = h?.address?.lines?.[0] || "";
              const cheapest = item?._cheapest || (Array.isArray(item?.offers) ? item.offers[0] : null);
              const price = offerPrice(cheapest);
              const currency = cheapest?.price?.currency || "EUR";

              return (
                <div key={idx} style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden", display: "grid", gridTemplateColumns: "220px 1fr 240px", background: "#fff" }}>
                  <div style={{ background: "#f5f5f5", minHeight: 180 }}>
                    <img
                      src={pickHotelImage(item) || seededPlaceholder(h?.name || h?.hotelId || idx)}
                      alt={name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.src = seededPlaceholder((h?.name || h?.hotelId || idx) + "-alt"); }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href="#!" style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", textDecoration: "none" }}>{name}</a>
                      {rating ? <span style={{ fontSize: 12, color: "#555" }}><StarRow rating={rating} /></span> : null}
                    </div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                      {cityName}{addr ? ` • ${addr}` : ""}
                    </div>
                    {Array.isArray(item?.offers) && item.offers.length > 1 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                        {item.offers.length} offers available
                      </div>
                    )}
                  </div>
                  <div style={{ borderLeft: "1px solid #eee", padding: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#666" }}>1 night, {adults} {adults > 1 ? "adults" : "adult"}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{isFinite(price) ? fmtCurrency(price, currency) : "—"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>+ taxes & fees</div>
                    </div>
                    <button
                      onClick={() => handleHotelSelect(item)}
                      style={{ background: "#0071c2", color: "#fff", fontWeight: 700, borderRadius: 8, border: "none", padding: "10px 14px", cursor: "pointer", width: 160 }}
                    >
                      Select Hotel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {showDebug && (results || flightResults) && (
            <pre style={{ marginTop: 12, background: "#f6f6f6", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 320 }}>
              {JSON.stringify(
                {
                  via: results?.via,
                  usedNearestDates: results?.usedNearestDates,
                  resolvedCity: results?.resolvedCity,
                  hotels_count: results?.data?.length,
                  flights_count: flightResults?.data?.length,
                  city, cityText
                },
                null,
                2
              )}
            </pre>
          )}
        </section>
      </div>

      {selectedOffer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div style={{ background: "#fff", padding: 16, borderRadius: 10, maxWidth: 720, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Offer Details</h3>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{selectedOffer?.room?.description?.text || "Room details"}</div>
            <div style={{ marginBottom: 8 }}>
              <strong>Total:</strong> {selectedOffer?.price?.total} {selectedOffer?.price?.currency}
            </div>
            {selectedOffer?.policies?.cancellations?.[0]?.deadline && (
              <div style={{ fontSize: 12, color: "#666" }}>Cancellation until: {selectedOffer.policies.cancellations[0].deadline}</div>
            )}
            <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 8, borderRadius: 6, maxHeight: 320, overflow: "auto" }}>
              {JSON.stringify(selectedOffer, null, 2)}
            </pre>
            <button onClick={() => setSelectedOffer(null)} style={{ marginTop: 8 }}>Close</button>
          </div>
        </div>
      )}

      {/* Hotel Booking Flow Modal */}
      <HotelBookingFlow
        selectedHotel={selectedHotel}
        onClose={handleCloseHotelBooking}
        onProceed={handleHotelBookingProceed}
        chosen={chosen}
      />
    </div>
  );
}

export default Hotels;
