/**
 * ============================================================================
 * FILE: lib/rateLimit.ts
 * ============================================================================
 *
 * Rate limiting — uses Upstash Redis in production so all serverless
 * instances share a single counter, falling back to an in-memory Map for
 * local development when the Upstash env vars are absent.
 *
 * To enable Redis: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * (available from console.upstash.com after creating a Redis database).
 * Without those variables the in-memory fallback is used — counts are
 * per-instance and reset on every cold start, which is fine for local dev
 * but provides no real protection across multiple Vercel instances.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ---------------------------------------------------------------------------
// IP extraction helpers (unchanged from original)
// ---------------------------------------------------------------------------

/**
 * Simple IPv4/IPv6 format validation — rejects obviously malformed values.
 * This isn't exhaustive but prevents header injection of non-IP strings.
 */
function looksLikeIp(value: string): boolean {
  // IPv4: 1-3 digit groups separated by dots
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  // IPv6: hex groups separated by colons (including shortened forms)
  if (/^[0-9a-fA-F:]+$/.test(value) && value.includes(":")) return true;
  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (/^::ffff:\d{1,3}(\.\d{1,3}){3}$/i.test(value)) return true;
  return false;
}

/**
 * Extract client IP from request headers.
 *
 * TRUST ORDER (most trustworthy first):
 * 1. x-vercel-forwarded-for — set by Vercel's edge, cannot be spoofed by clients
 * 2. x-real-ip — typically set by reverse proxy (Nginx, Cloudflare)
 * 3. x-forwarded-for — rightmost non-private IP (leftmost can be spoofed)
 * 4. "unknown" — fallback when behind no proxy (e.g. local dev)
 *
 * IMPORTANT: On Vercel, x-vercel-forwarded-for is authoritative. For other
 * hosting providers, ensure your reverse proxy overwrites (not appends)
 * x-real-ip so it cannot be client-spoofed.
 */
function extractIp(headerGetter: { get: (name: string) => string | null }): string {
  // 1. Vercel-specific header (cannot be spoofed by clients)
  const vercelIp = headerGetter.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const ip = vercelIp.split(",")[0].trim();
    if (ip && looksLikeIp(ip)) return ip;
  }

  // 2. x-real-ip — set by the proxy itself, generally trustworthy
  const realIp = headerGetter.get("x-real-ip");
  if (realIp) {
    const ip = realIp.trim();
    if (ip && looksLikeIp(ip)) return ip;
  }

  // 3. x-forwarded-for — take the LAST entry (closest to the server)
  //    because clients can prepend fake IPs to the left side
  const forwarded = headerGetter.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (looksLikeIp(parts[i])) return parts[i];
    }
  }

  return "unknown";
}

function getIdentifier(request: Request): string {
  return extractIp({ get: (name: string) => request.headers.get(name) });
}

function getIdentifierFromHeaders(headerStore: { get: (name: string) => string | null }): string {
  return extractIp(headerStore);
}

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client once at module load — null when env vars are absent
const redis: Redis | null =
  UPSTASH_URL && UPSTASH_TOKEN
    ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
    : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "⚠️  Rate limiting: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. " +
    "In-memory fallback active — counts are per-instance and not shared across serverless workers."
  );
}

// Cache Upstash Ratelimit instances keyed by "prefix:limit" so we don't
// recreate them on every request (each instance is stateless but non-trivial to construct).
const upstashCache = new Map<string, Ratelimit>();

function getUpstashLimiter(prefix: string, limit: number): Ratelimit {
  const cacheKey = `${prefix}:${limit}`;
  let limiter = upstashCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, "60 s"),
      prefix: `ratelimit:${prefix}`,
    });
    upstashCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function cleanupOldEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

function inMemoryCheck(
  key: string,
  limit: number,
  intervalMs = 60_000
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();

  if (Math.random() < 0.01) cleanupOldEntries(now);

  let tokenData = rateLimitStore.get(key);
  if (!tokenData || now > tokenData.resetTime) {
    tokenData = { count: 0, resetTime: now + intervalMs };
    rateLimitStore.set(key, tokenData);
  }
  tokenData.count++;

  return {
    success: tokenData.count <= limit,
    limit,
    remaining: Math.max(0, limit - tokenData.count),
    reset: tokenData.resetTime,
  };
}

// ---------------------------------------------------------------------------
// Public API — identical surface to the original so all callers are unchanged
// ---------------------------------------------------------------------------

type RateLimitResult = { success: boolean; limit: number; remaining: number; reset: number };

function makeLimiter(prefix: string) {
  return {
    check: async (request: Request, limit: number): Promise<RateLimitResult> => {
      const identifier = getIdentifier(request);
      const key = `${prefix}:${identifier}`;

      if (redis) {
        const limiter = getUpstashLimiter(prefix, limit);
        const { success, limit: l, remaining, reset } = await limiter.limit(key);
        // Upstash reset is ms since epoch — same unit as in-memory fallback
        return { success, limit: l, remaining, reset };
      }

      return inMemoryCheck(key, limit);
    },
  };
}

export const RateLimiters = {
  strict:   makeLimiter("strict"),
  standard: makeLimiter("standard"),
  generous: makeLimiter("generous"),
  auth:     makeLimiter("auth"),
};

/**
 * Rate-limit check for Next.js server actions (reads IP from next/headers).
 * Returns { success, remaining } — caller decides how to handle failure.
 */
export async function checkActionRateLimit(
  limiterKey: keyof typeof RateLimiters,
  limit: number,
  actionName: string
): Promise<{ success: boolean; remaining: number }> {
  // limiterKey is accepted for API compatibility but the window (60 s) is
  // uniform across all limiters — the actionName is used as the Redis prefix
  // so each action has its own independent counter.
  void limiterKey;

  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const identifier = getIdentifierFromHeaders(headerStore);
  const key = `${actionName}:${identifier}`;

  if (redis) {
    const limiter = getUpstashLimiter(actionName, limit);
    const { success, remaining } = await limiter.limit(key);
    return { success, remaining };
  }

  const result = inMemoryCheck(key, limit);
  return { success: result.success, remaining: result.remaining };
}

export function rateLimitResponse(result: { limit: number; remaining: number; reset: number }) {
  return Response.json(
    {
      error: "Too many requests",
      message: "Please try again later",
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset).toISOString(),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
      },
    }
  );
}
