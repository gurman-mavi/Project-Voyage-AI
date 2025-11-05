const crypto = require("crypto");
let redisClient = null;
const memory = new Map();

async function initCache() {
  const url = process.env.REDIS_URL;
  if (url) {
    const { createClient } = require("redis");
    redisClient = createClient({ url });
    redisClient.on("error", (e) => console.error("Redis error:", e));
    await redisClient.connect();
    console.log("✔ Redis cache enabled");
  } else {
    console.log("ℹ Using in-memory cache");
  }
}

function makeKey(prefix, obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  const hash = crypto.createHash("sha1").update(str).digest("hex");
  return `${prefix}:${hash}`;
}

async function cget(key) {
  if (redisClient) {
    const v = await redisClient.get(key);
    return v ? JSON.parse(v) : null;
  }
  return memory.get(key) ?? null;
}

async function cset(key, val, ttlSec) {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(val), { EX: ttlSec });
  } else {
    memory.set(key, val);
    setTimeout(() => memory.delete(key), ttlSec * 1000).unref?.();
  }
}

module.exports = { initCache, makeKey, cget, cset };
