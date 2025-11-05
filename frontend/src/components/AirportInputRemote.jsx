// src/components/AirportInputRemote.jsx
import { useEffect, useRef, useState } from "react";

/**
 * Props:
 * - label: string
 * - value: string (IATA code like "DEL")
 * - onChange: (code: string) => void
 * - placeholder?: string
 * - className?: string
 */
export default function AirportInputRemote({
  label = "Airport",
  value,
  onChange,
  placeholder = "Type city or airport code",
  className = "",
}) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const timer = useRef(null);

  // keep input text in sync if parent changes value
  useEffect(() => setQ(value || ""), [value]);

  // close dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current || boxRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // search as user types (debounced)
  useEffect(() => {
    if (!q || q.length < 2) {
      setRows([]);
      return;
    }
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/airports?q=${encodeURIComponent(q)}`);
        if (!r.ok) throw new Error("airports fetch failed");
        const data = await r.json();
        setRows(Array.isArray(data) ? data.slice(0, 10) : []);
        setActive(0);
      } catch (e) {
        console.error("autocomplete", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q]);

  const choose = (a) => {
    if (!a) return;
    onChange?.(a.code?.toUpperCase?.() || "");
    setQ(a.code?.toUpperCase?.() || "");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={className} ref={boxRef}>
      <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-10 w-full border rounded-xl px-3 bg-white outline-none"
        autoComplete="off"
      />
      {open && (loading || rows.length > 0) && (
        <ul className="mt-1 max-h-64 overflow-auto border bg-white rounded-xl shadow-lg ring-1 ring-black/5">
          {loading && (
            <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li>
          )}
          {!loading &&
            rows.map((a, i) => (
              <li
                key={`${a.type}-${a.code}-${i}`}
                onMouseDown={() => choose(a)} // mousedown prevents input blur before click
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                  i === active ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <div>
                  <div className="font-medium">
                    {a.city} ({a.code})
                  </div>
                  <div className="text-xs text-neutral-600">
                    {a.name}, {a.country}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">{a.type}</div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
