import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);
const CART_KEY = "voyage_trip_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

const defaultCart = {
  origin: "DEL",
  destination: "",
  dates: { start: "", end: "" },
  adults: 1,
  budget: 5000, // Default budget $5,000 USD (reasonable for international trips)
  selectedFlight: null,
  selectedHotel: null,
};

export function TripCartProvider({ children }) {
  const [cart, setCart] = useState(() => loadCart() || defaultCart);

  useEffect(() => { saveCart(cart); }, [cart]);

  const api = useMemo(() => ({
    cart,
    setOrigin: (o) => setCart(c => ({ ...c, origin: String(o || "").toUpperCase() })),
    setDestination: (d) => setCart(c => ({ ...c, destination: String(d || "").toUpperCase() })),
    setDates: (s, e) => setCart(c => ({ ...c, dates: { start: s || "", end: e || "" } })),
    setAdults: (n) => setCart(c => ({ ...c, adults: Math.max(1, Number(n || 1)) })),
    setBudget: (b) => setCart(c => ({ ...c, budget: Math.max(0, Number(b || 0)) })),
    selectFlight: (flight) => setCart(c => ({ ...c, selectedFlight: flight })),
    selectHotel: (hotel) => setCart(c => ({ ...c, selectedHotel: hotel })),
    clear: () => setCart(defaultCart),
    isReadyToFinalize: () => !!(cart.destination && cart.dates.start && cart.dates.end && cart.selectedFlight && cart.selectedHotel),
  }), [cart]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useTripCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useTripCart must be used within TripCartProvider");
  return ctx;
}
