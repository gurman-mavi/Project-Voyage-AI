import { useEffect, useMemo, useState } from "react";

export default function WorldMapModal({ items = [], onClose, onSelect }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen for selection from the iframe
  useEffect(() => {
    function handler(e) {
      const d = e?.data;
      if (d && d.__type === 'select-city' && d.payload) {
        onSelect?.(d.payload);
        onClose?.();
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onClose, onSelect]);

  // Build a small list of unique city strings for geocoding
  const cities = useMemo(() => {
    const set = new Set();
    const arr = [];
    for (const d of items.slice(0, 200)) { // cap to 200 for free geocoder
      const key = `${d.cityName}|${d.country}`;
      if (!set.has(key)) { set.add(key); arr.push({ city: d.cityName, country: d.country, iata: d.destinationIata }); }
    }
    return arr;
  }, [items]);

  useEffect(() => {
    let alive = true;
    async function geocodeAll() {
      setLoading(true);
      const out = [];
      for (const c of cities) {
        try {
          const q = encodeURIComponent(`${c.city}, ${c.country}`);
          const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("geo");
          const j = await res.json();
          const hit = Array.isArray(j) && j[0];
          if (hit?.lat && hit?.lon) out.push({ ...c, lat: +hit.lat, lon: +hit.lon });
        } catch {}
      }
      if (alive) { setPoints(out); setLoading(false); }
    }
    geocodeAll();
    return () => { alive = false; };
  }, [cities]);

  const html = buildLeafletHTML(points);

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-6 bg-white rounded-2xl border shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">World map</div>
          <button onClick={onClose} className="text-sm rounded-md border px-3 py-1.5 bg-white hover:bg-neutral-50">Close</button>
        </div>
        <iframe title="World map" srcDoc={html} className="w-full h-[calc(100%-48px)]" />
        {loading && (
          <div className="absolute left-1/2 top-12 -translate-x-1/2 text-xs bg-white/90 px-2 py-1.5 rounded border">Geocoding…</div>
        )}
      </div>
    </div>
  );
}

function buildLeafletHTML(points) {
  const markers = points.map((p) => ({ city: p.city, country: p.country, iata: p.iata || "", lat: p.lat, lon: p.lon }));
  const markersJson = JSON.stringify(markers);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { height:100%; margin:0; }
  .marker-popup{ font:12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  .marker-popup button{ margin-top:6px; padding:4px 8px; border:1px solid #ddd; border-radius:6px; background:#fff; cursor:pointer; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const points = ${markersJson};
  const map = L.map('map').setView([20, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
  const group = [];
  function bind(m, p){
    const html = '<div class="marker-popup"><b>'+p.city+'</b>, '+p.country+'<br/>'+
      '<button class="open-btn" data-city="'+encodeURIComponent(p.city)+'" data-country="'+encodeURIComponent(p.country)+'" data-iata="'+encodeURIComponent(p.iata||'')+'">Open Concierge</button></div>';
    m.bindPopup(html);
    m.on('popupopen', function(e){
      const btn = e.popup._contentNode.querySelector('.open-btn');
      if (btn) btn.addEventListener('click', function(){
        const payload = {
          city: decodeURIComponent(this.getAttribute('data-city')),
          country: decodeURIComponent(this.getAttribute('data-country')),
          iata: decodeURIComponent(this.getAttribute('data-iata'))
        };
        window.parent.postMessage({ __type: 'select-city', payload }, '*');
      });
    });
  }
  for (const p of points) {
    const m = L.marker([p.lat, p.lon]).addTo(map);
    bind(m, p);
    group.push(m);
  }
  if (group.length) {
    const g = L.featureGroup(group);
    map.fitBounds(g.getBounds().pad(0.2));
  }
</script>
</body>
</html>`;
}
