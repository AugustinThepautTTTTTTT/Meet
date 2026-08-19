type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count > limit)
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  return { allowed: true, retryAfter: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
