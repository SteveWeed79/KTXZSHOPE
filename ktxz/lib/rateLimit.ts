/**
 * ============================================================================
 * FILE: lib/rateLimit.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Simple Rate Limiting (In-Memory)
 * For production with multiple servers, use Redis
 */

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
    // Use rightmost IP — it's the one added by the outermost trusted proxy
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

function cleanupOldEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export function rateLimit(options: { interval: number; uniqueTokenPerInterval: number }) {
  const { interval, uniqueTokenPerInterval } = options;

  return {
    check: async (request: Request, limit: number) => {
      const identifier = getIdentifier(request);
      const now = Date.now();
      
      if (Math.random() < 0.01) {
        cleanupOldEntries(now);
      }
      
      let tokenData = rateLimitStore.get(identifier);
      
      if (!tokenData && rateLimitStore.size >= uniqueTokenPerInterval) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey) rateLimitStore.delete(oldestKey);
      }
      
      if (!tokenData || now > tokenData.resetTime) {
        tokenData = {
          count: 0,
          resetTime: now + interval,
        };
        rateLimitStore.set(identifier, tokenData);
      }
      
      tokenData.count++;
      
      return {
        success: tokenData.count <= limit,
        limit,
        remaining: Math.max(0, limit - tokenData.count),
        reset: tokenData.resetTime,
      };
    },
  };
}

export const RateLimiters = {
  strict: rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 }),
  standard: rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 }),
  generous: rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 }),
  auth: rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 }),
};

/**
 * Rate-limit check for server actions using next/headers.
 * Returns { success, remaining } — caller decides how to handle failure.
 */
export async function checkActionRateLimit(
  limiterKey: keyof typeof RateLimiters,
  limit: number,
  actionName: string
): Promise<{ success: boolean; remaining: number }> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const identifier = getIdentifierFromHeaders(headerStore);
  const key = `${actionName}:${identifier}`;

  const limiter = RateLimiters[limiterKey];
  // Create a minimal Request-like object for the existing check method
  const fakeReq = { headers: { get: (name: string) => headerStore.get(name) } } as unknown as Request;
  // Use a namespaced key to avoid collision across different actions
  const now = Date.now();

  // Direct store access for namespaced key
  let tokenData = rateLimitStore.get(key);
  if (!tokenData || now > tokenData.resetTime) {
    tokenData = { count: 0, resetTime: now + 60_000 };
    rateLimitStore.set(key, tokenData);
  }
  tokenData.count++;

  return {
    success: tokenData.count <= limit,
    remaining: Math.max(0, limit - tokenData.count),
  };
}

export function rateLimitResponse(result: any) {
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