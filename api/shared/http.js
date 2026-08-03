export function json(status, body, headers = {}) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

const buckets = new Map();
export function rateLimit(key, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  buckets.set(key, entry);
  return entry.count <= limit;
}

export function clientKey(request) {
  const headers = request?.headers;
  let xf = "";
  if (headers && typeof headers.get === "function") {
    xf = headers.get("x-forwarded-for") || headers.get("X-Forwarded-For") || "";
  } else if (headers && typeof headers === "object") {
    xf = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  }
  if (Array.isArray(xf)) xf = xf[0] || "";
  const ip = String(xf).split(",")[0]?.trim() || "unknown";
  // privacy-preserving: hash-like truncation, do not store raw IP in responses
  return `rl_${Buffer.from(ip).toString("base64url").slice(0, 12)}`;
}
