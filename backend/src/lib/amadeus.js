// lib/amadeus.js
import axios from "axios";

const BASE =
  process.env.AMADEUS_BASE ||
  ((String(process.env.AMADEUS_ENV || "test").toLowerCase() === "prod")
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com");
const DISABLE = String(process.env.AMADEUS_DISABLE || "false").toLowerCase() === "true";
const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

let token = null;
let tokenExpiry = 0;

export async function getAccessToken() {
  if (DISABLE) throw new Error("Amadeus disabled");
  const now = Date.now();
  if (token && now < tokenExpiry - 60_000) return token;

  const { data } = await axios.post(
    `${BASE}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  token = data.access_token;
  tokenExpiry = now + data.expires_in * 1000;
  return token;
}

export async function aGet(path, query = {}) {
  if (DISABLE) throw new Error("Amadeus disabled");
  const access = await getAccessToken();
  const { data } = await axios.get(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    params: query,
  });
  return data;
}

export async function aPost(path, body = {}) {
  if (DISABLE) throw new Error("Amadeus disabled");
  const access = await getAccessToken();
  const { data } = await axios.post(`${BASE}${path}`, body, {
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
  });
  return data;
}
