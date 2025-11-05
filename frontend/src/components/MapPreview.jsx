import { useEffect, useState } from "react";

export default function MapPreview({ city = "", country = "", height = 180, className = "" }) {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function geocode() {
      try {
        setError("");
        setCoords(null);
        const q = encodeURIComponent([city, country].filter(Boolean).join(", "));
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
        const res = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("geo fail");
        const json = await res.json();
        const hit = Array.isArray(json) && json[0];
        if (alive && hit?.lat && hit?.lon) setCoords({ lat: +hit.lat, lon: +hit.lon });
        else if (alive) setError("No result");
      } catch (e) {
        if (alive) setError("Geocoding error");
      }
    }
    if (city) geocode();
    return () => { alive = false; };
  }, [city, country]);

  if (!city) return null;

  const h = typeof height === "number" ? `${height}px` : height;

  if (!coords) {
    return (
      <div className={`w-full rounded-xl border bg-neutral-50 text-neutral-500 grid place-items-center ${className}`} style={{ height: h }}>
        {error ? `Map unavailable` : "Loading map…"}
      </div>
    );
  }

  const { lat, lon } = coords;
  const delta = 0.06; // ~small city box
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
  const marker = `${lat},${lon}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  return (
    <div className={`w-full overflow-hidden rounded-xl border ${className}`} style={{ height: h }}>
      <iframe
        title={`Map of ${city}${country ? ", " + country : ""}`}
        src={src}
        style={{ border: 0, width: "100%", height: "100%" }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
