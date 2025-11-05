// src/lib/makeFlightsUrl.js
export function makeFlightsUrl(data = {}) {
    const {
      origin = "",
      dest = "",
      depart = new Date().toISOString().slice(0, 10),
      return: ret = "",
      currency = "INR",
      adults = 1,
      cabin = "ECONOMY",
    } = data || {};
  
    const params = new URLSearchParams();
    if (origin) params.set("from", String(origin).toUpperCase());
    if (dest) params.set("to", String(dest).toUpperCase());
    if (depart) params.set("date", String(depart).slice(0, 10));
    if (ret) params.set("ret", String(ret).slice(0, 10));
    if (currency) params.set("currency", String(currency).toUpperCase());
  
    // keep extra params if you’re passing them
    if (adults) params.set("adults", String(adults));
    if (cabin) params.set("cabin", String(cabin).toUpperCase());
  
    return `/flights?${params.toString()}`;
  }
  