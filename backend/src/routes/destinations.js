import express from "express";

const router = express.Router();


/* -------------------------- Country → Region -------------------------- */
const COUNTRY_TO_REGION = {
  // Asia
  IN:"Asia", AE:"Asia", SA:"Asia", OM:"Asia", BH:"Asia", QA:"Asia", KW:"Asia",
  NP:"Asia", LK:"Asia", BD:"Asia", PK:"Asia", BT:"Asia", MV:"Asia",
  TH:"Asia", SG:"Asia", MY:"Asia", ID:"Asia", PH:"Asia", VN:"Asia", KH:"Asia", LA:"Asia",
  CN:"Asia", JP:"Asia", KR:"Asia", TW:"Asia", HK:"Asia", MO:"Asia",
  JO:"Asia", IL:"Asia", LB:"Asia",
  // Europe
  TR:"Europe", FR:"Europe", DE:"Europe", ES:"Europe", PT:"Europe", IT:"Europe", GR:"Europe",
  NL:"Europe", BE:"Europe", LU:"Europe", IE:"Europe", GB:"Europe",
  CH:"Europe", AT:"Europe", CZ:"Europe", SK:"Europe", PL:"Europe", HU:"Europe",
  SE:"Europe", NO:"Europe", FI:"Europe", DK:"Europe", IS:"Europe",
  RO:"Europe", BG:"Europe", HR:"Europe", SI:"Europe", RS:"Europe",
  BA:"Europe", MK:"Europe", AL:"Europe", UA:"Europe", LT:"Europe", LV:"Europe", EE:"Europe",
  MT:"Europe", CY:"Europe",
  // North America
  US:"North America", CA:"North America", MX:"North America",
  // South America
  BR:"South America", AR:"South America", CL:"South America", PE:"South America", CO:"South America",
  UY:"South America", EC:"South America", BO:"South America", PY:"South America", VE:"South America",
  // Africa
  EG:"Africa", MA:"Africa", DZ:"Africa", TN:"Africa", ZA:"Africa", KE:"Africa", TZ:"Africa",
  ET:"Africa", NG:"Africa", GH:"Africa", SN:"Africa", RW:"Africa", MU:"Africa", SC:"Africa",
  // Oceania
  AU:"Oceania", NZ:"Oceania", FJ:"Oceania", PG:"Oceania"
};
const regionOf = (cc) => COUNTRY_TO_REGION[cc] || "Other";

/* ---------------------------- Static Catalog --------------------------- */
/** Minimal fields per item: destinationIata, cityName, country (ISO-2). */
export const CATALOG = [
  // -------- India (extensive) --------
  { destinationIata:"DEL", cityName:"Delhi", country:"IN" },
  { destinationIata:"BOM", cityName:"Mumbai", country:"IN" },
  { destinationIata:"BLR", cityName:"Bengaluru", country:"IN" },
  { destinationIata:"MAA", cityName:"Chennai", country:"IN" },
  { destinationIata:"HYD", cityName:"Hyderabad", country:"IN" },
  { destinationIata:"CCU", cityName:"Kolkata", country:"IN" },
  { destinationIata:"COK", cityName:"Kochi", country:"IN" },
  { destinationIata:"GOI", cityName:"Goa", country:"IN" },
  { destinationIata:"PNQ", cityName:"Pune", country:"IN" },
  { destinationIata:"AMD", cityName:"Ahmedabad", country:"IN" },
  { destinationIata:"JAI", cityName:"Jaipur", country:"IN" },
  { destinationIata:"LKO", cityName:"Lucknow", country:"IN" },
  { destinationIata:"ATQ", cityName:"Amritsar", country:"IN" },
  { destinationIata:"IXC", cityName:"Chandigarh", country:"IN" },
  { destinationIata:"BBI", cityName:"Bhubaneswar", country:"IN" },
  { destinationIata:"PAT", cityName:"Patna", country:"IN" },
  { destinationIata:"VNS", cityName:"Varanasi", country:"IN" },
  { destinationIata:"BHO", cityName:"Bhopal", country:"IN" },
  { destinationIata:"IDR", cityName:"Indore", country:"IN" },
  { destinationIata:"RPR", cityName:"Raipur", country:"IN" },
  { destinationIata:"NAG", cityName:"Nagpur", country:"IN" },
  { destinationIata:"TRV", cityName:"Thiruvananthapuram", country:"IN" },
  { destinationIata:"CCJ", cityName:"Kozhikode", country:"IN" },
  { destinationIata:"IXM", cityName:"Madurai", country:"IN" },
  { destinationIata:"CJB", cityName:"Coimbatore", country:"IN" },
  { destinationIata:"VTZ", cityName:"Visakhapatnam", country:"IN" },
  { destinationIata:"VGA", cityName:"Vijayawada", country:"IN" },
  { destinationIata:"IXE", cityName:"Mangaluru", country:"IN" },
  { destinationIata:"GAU", cityName:"Guwahati", country:"IN" },
  { destinationIata:"DED", cityName:"Dehradun", country:"IN" },
  { destinationIata:"SXR", cityName:"Srinagar", country:"IN" },
  { destinationIata:"IXL", cityName:"Leh", country:"IN" },
  { destinationIata:"IXZ", cityName:"Port Blair", country:"IN" },
  { destinationIata:"UDR", cityName:"Udaipur", country:"IN" },
  { destinationIata:"STV", cityName:"Surat", country:"IN" },
  { destinationIata:"BDQ", cityName:"Vadodara", country:"IN" },
  { destinationIata:"AGR", cityName:"Agra", country:"IN" },
  { destinationIata:"JLR", cityName:"Jabalpur", country:"IN" },
  { destinationIata:"RAJ", cityName:"Rajkot", country:"IN" },
  { destinationIata:"IXA", cityName:"Agartala", country:"IN" },
  { destinationIata:"IXB", cityName:"Bagdogra", country:"IN" },
  { destinationIata:"IXR", cityName:"Ranchi", country:"IN" },
  { destinationIata:"DIB", cityName:"Dibrugarh", country:"IN" },
  { destinationIata:"IMF", cityName:"Imphal", country:"IN" },
  { destinationIata:"SHL", cityName:"Shillong", country:"IN" },

  // -------- Middle East / Asia --------
  { destinationIata:"DXB", cityName:"Dubai", country:"AE" },
  { destinationIata:"AUH", cityName:"Abu Dhabi", country:"AE" },
  { destinationIata:"DOH", cityName:"Doha", country:"QA" },
  { destinationIata:"MCT", cityName:"Muscat", country:"OM" },
  { destinationIata:"RUH", cityName:"Riyadh", country:"SA" },
  { destinationIata:"JED", cityName:"Jeddah", country:"SA" },
  { destinationIata:"BKK", cityName:"Bangkok", country:"TH" },
  { destinationIata:"HKT", cityName:"Phuket", country:"TH" },
  { destinationIata:"SIN", cityName:"Singapore", country:"SG" },
  { destinationIata:"KUL", cityName:"Kuala Lumpur", country:"MY" },
  { destinationIata:"DPS", cityName:"Bali", country:"ID" },
  { destinationIata:"CGK", cityName:"Jakarta", country:"ID" },
  { destinationIata:"HAN", cityName:"Hanoi", country:"VN" },
  { destinationIata:"SGN", cityName:"Ho Chi Minh City", country:"VN" },
  { destinationIata:"MNL", cityName:"Manila", country:"PH" },
  { destinationIata:"HKG", cityName:"Hong Kong", country:"HK" },
  { destinationIata:"TPE", cityName:"Taipei", country:"TW" },
  { destinationIata:"ICN", cityName:"Seoul", country:"KR" },
  { destinationIata:"NRT", cityName:"Tokyo", country:"JP" },
  { destinationIata:"KIX", cityName:"Osaka", country:"JP" },
  { destinationIata:"PEK", cityName:"Beijing", country:"CN" },
  { destinationIata:"PVG", cityName:"Shanghai", country:"CN" },

  // -------- Europe --------
  { destinationIata:"LHR", cityName:"London", country:"GB" },
  { destinationIata:"LGW", cityName:"London (Gatwick)", country:"GB" },
  { destinationIata:"MAN", cityName:"Manchester", country:"GB" },
  { destinationIata:"EDI", cityName:"Edinburgh", country:"GB" },
  { destinationIata:"CDG", cityName:"Paris", country:"FR" },
  { destinationIata:"NCE", cityName:"Nice", country:"FR" },
  { destinationIata:"AMS", cityName:"Amsterdam", country:"NL" },
  { destinationIata:"BRU", cityName:"Brussels", country:"BE" },
  { destinationIata:"FRA", cityName:"Frankfurt", country:"DE" },
  { destinationIata:"MUC", cityName:"Munich", country:"DE" },
  { destinationIata:"BER", cityName:"Berlin", country:"DE" },
  { destinationIata:"ZRH", cityName:"Zurich", country:"CH" },
  { destinationIata:"GVA", cityName:"Geneva", country:"CH" },
  { destinationIata:"VIE", cityName:"Vienna", country:"AT" },
  { destinationIata:"PRG", cityName:"Prague", country:"CZ" },
  { destinationIata:"BUD", cityName:"Budapest", country:"HU" },
  { destinationIata:"WAW", cityName:"Warsaw", country:"PL" },
  { destinationIata:"CPH", cityName:"Copenhagen", country:"DK" },
  { destinationIata:"ARN", cityName:"Stockholm", country:"SE" },
  { destinationIata:"OSL", cityName:"Oslo", country:"NO" },
  { destinationIata:"BCN", cityName:"Barcelona", country:"ES" },
  { destinationIata:"MAD", cityName:"Madrid", country:"ES" },
  { destinationIata:"LIS", cityName:"Lisbon", country:"PT" },
  { destinationIata:"FCO", cityName:"Rome", country:"IT" },
  { destinationIata:"MXP", cityName:"Milan", country:"IT" },
  { destinationIata:"ATH", cityName:"Athens", country:"GR" },
  { destinationIata:"IST", cityName:"Istanbul", country:"TR" },
  { destinationIata:"DUB", cityName:"Dublin", country:"IE" },
  { destinationIata:"KEF", cityName:"Reykjavík", country:"IS" },
  { destinationIata:"VCE", cityName:"Venice", country:"IT" },

  // -------- North America --------
  { destinationIata:"JFK", cityName:"New York", country:"US" },
  { destinationIata:"EWR", cityName:"Newark", country:"US" },
  { destinationIata:"LAX", cityName:"Los Angeles", country:"US" },
  { destinationIata:"SFO", cityName:"San Francisco", country:"US" },
  { destinationIata:"ORD", cityName:"Chicago", country:"US" },
  { destinationIata:"SEA", cityName:"Seattle", country:"US" },
  { destinationIata:"MIA", cityName:"Miami", country:"US" },
  { destinationIata:"MCO", cityName:"Orlando", country:"US" },
  { destinationIata:"DFW", cityName:"Dallas–Fort Worth", country:"US" },
  { destinationIata:"IAH", cityName:"Houston", country:"US" },
  { destinationIata:"BOS", cityName:"Boston", country:"US" },
  { destinationIata:"IAD", cityName:"Washington, DC", country:"US" },
  { destinationIata:"YYZ", cityName:"Toronto", country:"CA" },
  { destinationIata:"YVR", cityName:"Vancouver", country:"CA" },
  { destinationIata:"YUL", cityName:"Montréal", country:"CA" },
  { destinationIata:"MEX", cityName:"Mexico City", country:"MX" },

  // -------- South America --------
  { destinationIata:"GRU", cityName:"São Paulo", country:"BR" },
  { destinationIata:"GIG", cityName:"Rio de Janeiro", country:"BR" },
  { destinationIata:"EZE", cityName:"Buenos Aires", country:"AR" },
  { destinationIata:"SCL", cityName:"Santiago", country:"CL" },
  { destinationIata:"LIM", cityName:"Lima", country:"PE" },
  { destinationIata:"BOG", cityName:"Bogotá", country:"CO" },
  { destinationIata:"UIO", cityName:"Quito", country:"EC" },

  // -------- Africa --------
  { destinationIata:"CAI", cityName:"Cairo", country:"EG" },
  { destinationIata:"CMN", cityName:"Casablanca", country:"MA" },
  { destinationIata:"RAK", cityName:"Marrakesh", country:"MA" },
  { destinationIata:"ADD", cityName:"Addis Ababa", country:"ET" },
  { destinationIata:"NBO", cityName:"Nairobi", country:"KE" },
  { destinationIata:"ZNZ", cityName:"Zanzibar", country:"TZ" },
  { destinationIata:"JNB", cityName:"Johannesburg", country:"ZA" },
  { destinationIata:"CPT", cityName:"Cape Town", country:"ZA" },
  { destinationIata:"KGL", cityName:"Kigali", country:"RW" },
  { destinationIata:"MRU", cityName:"Mauritius", country:"MU" },
  { destinationIata:"SEZ", cityName:"Seychelles", country:"SC" },

  // -------- Oceania --------
  { destinationIata:"SYD", cityName:"Sydney", country:"AU" },
  { destinationIata:"MEL", cityName:"Melbourne", country:"AU" },
  { destinationIata:"BNE", cityName:"Brisbane", country:"AU" },
  { destinationIata:"PER", cityName:"Perth", country:"AU" },
  { destinationIata:"AKL", cityName:"Auckland", country:"NZ" },
  { destinationIata:"ZQN", cityName:"Queenstown", country:"NZ" },
  { destinationIata:"NAN", cityName:"Nadi", country:"FJ" }
];

/* normalize with region */
export function normalizeCatalog(list) {
  return list.map((x) => ({
    destinationIata: x.destinationIata,
    cityName: x.cityName,
    country: x.country,
    region: regionOf(x.country)
  }));
}

/* --------------------------- Shared Handler --------------------------- */
function listCatalog(req, res) {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const region = String(req.query.region || "").trim();
    const country = String(req.query.country || "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit || 300)));

    let list = normalizeCatalog(CATALOG);

    if (q) {
      list = list.filter(d =>
        d.cityName.toLowerCase().includes(q) ||
        d.destinationIata.toLowerCase().includes(q)
      );
    }
    if (region) list = list.filter(d => d.region === region);
    if (country) list = list.filter(d => d.country === country);

    // Sort by region then city
    list.sort((a, b) => (a.region + a.cityName).localeCompare(b.region + b.cityName));

    res.json({ data: list.slice(0, limit), via: "catalog" });
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
}

/* -------------------------------- Routes ------------------------------ */
router.get("/catalog", listCatalog);
// Backward-compatible alias — NOW uses the same handler (no router.handle hack)
router.get("/all", listCatalog);


// GET /api/destinations/suggest?q=pa&limit=12
router.get("/suggest", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 12)));
    if (q.length < 2) return res.json({ data: [] });

    const list = normalizeCatalog(CATALOG);

    const matches = [];
    for (const d of list) {
      const city = d.cityName.toLowerCase();
      const code = (d.destinationIata || "").toLowerCase();

      let score = -1;
      if (city.startsWith(q)) score = 100;
      else if (code.startsWith(q)) score = 90;
      else if (city.includes(q)) score = 70;
      else if (code.includes(q)) score = 60;

      if (score >= 0) {
        matches.push({
          id: d.destinationIata || `${d.cityName}-${d.country}`,
          code: d.destinationIata || "",
          city: d.cityName,
          country: d.country,
          region: d.region,
          label: `${d.cityName}${d.country ? ", " + d.country : ""}${d.destinationIata ? " • " + d.destinationIata : ""}`,
          _score: score
        });
      }
    }

    matches.sort((a, b) => b._score - a._score || a.city.localeCompare(b.city));
    res.json({ data: matches.slice(0, limit), via: "catalog:suggest" });
  } catch (e) {
    res.status(500).json({ error: "server_error", meta: String(e?.message || e) });
  }
});

export default router;
