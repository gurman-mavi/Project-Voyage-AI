// REPLACE FULL FILE with this:
import axios from "axios";

const AMADEUS_BASE =
  process.env.AMADEUS_BASE || "https://test.api.amadeus.com";

let token = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (token && Date.now() < tokenExpiry - 60_000) return token;

  const { data } = await axios.post(
    `${AMADEUS_BASE}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return token;
}

export async function aGet(path, params = {}) {
  const access = await getAccessToken();
  const { data } = await axios.get(`${AMADEUS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    params,
  });
  return data;
}
