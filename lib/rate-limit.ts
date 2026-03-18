// Debug: Simple in-memory rate limiter for auth and API endpoints
// Uses a sliding window approach with automatic cleanup
// Note: Per-instance on Vercel (not globally shared), but effective against brute force

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Debug: Clean up expired entries every 60 seconds to prevent memory leaks
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g. IP address or IP+path)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default 60s)
 * @returns { limited: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): { limited: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Debug: First request in this window or window expired
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: limit - entry.count, resetAt: entry.resetAt };
}
