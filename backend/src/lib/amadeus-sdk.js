// backend/src/lib/amadeus-sdk.js
// Ensure env is loaded even if this file is imported before server.js runs
import dotenv from "dotenv";
dotenv.config();

import Amadeus from "amadeus";

let instance = null;

/**
 * Returns a singleton Amadeus SDK client.
 * Loads env inside this module so clientId/secret are available at import time.
 */
export function getAmadeus() {
  if (instance) return instance;

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      `Amadeus credentials missing. Check .env:
AMADEUS_CLIENT_ID=${clientId || "(missing)"}
AMADEUS_CLIENT_SECRET=${clientSecret ? "SET" : "(missing)"}`
    );
  }

  instance = new Amadeus({
    clientId,
    clientSecret,
    hostname:
      (process.env.AMADEUS_ENV || "test").toLowerCase() === "prod"
        ? "api.amadeus.com"
        : "test.api.amadeus.com",
  });

  return instance;
}

export default getAmadeus;
