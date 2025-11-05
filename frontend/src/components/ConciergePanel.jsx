import { useEffect, useMemo, useRef, useState } from "react";
import AIChat from "./AIChat.jsx";
import MapPreview from "./MapPreview.jsx";
import { useTripCart } from "../contexts/TripCartContext.jsx";
import { useTripNavigation } from "../lib/navigation.js";

export default function ConciergePanel({ city = "", country = "", iata = "", onClose, mode = "chat" }) {
  const { selectHotel, selectFlight, setDestination } = useTripCart();
  const { goToFlights, goToHotels } = useTripNavigation();

  // Do not auto-send anything on open; we want chip clicks to send with a strict prefix
  const [seed, setSeed] = useState("");
  const [send, setSend] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const topicRef = useRef("");
  const chatSendRef = useRef(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Quick mini-forms
  const [hotelName, setHotelName] = useState("");
  const [hotelPrice, setHotelPrice] = useState("");
  const [hotelCurrency, setHotelCurrency] = useState("INR");
  const [flightAirline, setFlightAirline] = useState("");
  const [flightPrice, setFlightPrice] = useState("");
  const [flightCurrency, setFlightCurrency] = useState("INR");

  useEffect(() => {
    // ensure destination gets into cart context (non-destructive)
    try { if (iata || city) setDestination(iata || city.toUpperCase()); } catch {}
  }, [city, iata, setDestination]);

  function runPrompt(newSeed, newTopic = "") {
    topicRef.current = newTopic; // set synchronously so AIChat sees it immediately
    // Prefer reusing the same chat using externalSendRef to avoid remounts
    if (chatSendRef.current) {
      chatSendRef.current(newSeed);
      return;
    }
    setSeed(newSeed);
    setSend(true);
    setInstanceKey(k => k + 1); // fallback: restart chat to auto-send
  }

  const actions = [
    { key: 'best_time', label: "Best time", prompt: bestTimeSeed(city, country) },
    { key: 'visa', label: "Visa rules", prompt: visaSeed(city, country) },
    { key: 'safety', label: "Safety", prompt: safetySeed(city, country) },
    { key: 'weather', label: "Weather", prompt: weatherSeed(city, country) },
    { key: 'sim', label: "Local SIM", prompt: simSeed(city, country) },
    { key: 'itinerary_family', label: "Family trip", prompt: profileSeed(city, country, "family") },
    { key: 'itinerary_couple', label: "Couple", prompt: profileSeed(city, country, "couple") },
    { key: 'itinerary_solo', label: "Solo", prompt: profileSeed(city, country, "solo") },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-[780px] bg-white shadow-xl border-l border-neutral-200 flex flex-col overflow-hidden">
        <header className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-neutral-500">AI Concierge</div>
              <div className="text-lg font-semibold text-neutral-900">{city}{country ? `, ${country}` : ""}</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 border text-neutral-600" title="active topic being sent">
              Topic: {topicRef.current || "—"}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-neutral-50">Close</button>
        </header>
        {mode === "map" ? (
          <div className="flex-1 min-h-0 px-4 pb-4 flex">
            <MapPreview city={city} country={country} height={"100%"} className="flex-1" />
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-neutral-200 flex flex-wrap gap-2">
              {actions.map(a => (
                <button
                  key={a.key}
                  onClick={() => runPrompt(a.prompt, a.key)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AIChat
                key={instanceKey}
                initialSeed={seed}
                autoSend={send}
                extraContext={{ city, country, topic: topicRef.current }}
                getExtraContext={() => ({ city, country, topic: topicRef.current })}
                externalSendRef={chatSendRef}
                showHeader={false}
              />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function baseSeed(city, country) {
  return `You are an AI travel concierge for ${city}${country ? ", " + country : ""}. Help the user plan a trip with clear, concise answers. When asked, include best time to visit, visa rules for Indian passport, safety score, monthly weather, and local SIM options. When suggesting flights or hotels, present 2–3 options with price estimates and allow the user to confirm to save to cart.`;
}
function instructionPrefix(city, country) {
  const place = `${city}${country ? ", " + country : ""}`;
  return [
    `You are an AI travel concierge for ${place}.`,
    `Answer directly and concisely with city-specific insight (no greeting).`,
    `Use short bullets. Tailor the structure to the prompt.`,
    `Do not ask follow-up questions unless requested.`,
  ].join(" ");
}
function bestTimeSeed(city, country) {
  return `For ${city}${country ? ", " + country : ""}, what are the best months to visit and what months to avoid? 2–3 bullets max.`;
}
function visaSeed(city, country) {
  return `Visa rules for ${city}${country ? ", " + country : ""} for an Indian passport holder. Processing time, category, fees, and links.`;
}
function safetySeed(city, country) {
  return `Safety and common scams in ${city}${country ? ", " + country : ""}. Provide a simple safety score (1–10) and 3 concrete tips.`;
}
function weatherSeed(city, country) {
  return `Typical monthly weather for ${city}${country ? ", " + country : ""} (temp range and rain). Recommend a 4–6 month window for best weather.`;
}
function simSeed(city, country) {
  return `Best local SIM/eSIM options for ${city}${country ? ", " + country : ""}. Providers, validity, approx costs, and where to buy.`;
}
function profileSeed(city, country, profile) {
  return `Create a 3-day itinerary for ${city}${country ? ", " + country : ""} tailored for a ${profile} traveler. Include morning/afternoon/evening blocks and dining suggestions.`;
}
