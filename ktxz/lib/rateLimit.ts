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
 * Extract client IP from request headers.
 * IMPORTANT: In production, ensure your reverse proxy (Vercel, Nginx, etc.)
 * sets x-forwarded-for / x-real-ip. Without a trusted proxy, these headers
 * can be spoofed by clients. Prefer x-real-ip when set by the proxy itself.
 */
function getIdentifier(request: Request): string {
  // Prefer x-real-ip (typically set by the proxy itself, harder to spoof)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

/**
 * Extract IP from next/headers for use in server actions (no Request object).
 */
function getIdentifierFromHeaders(headerStore: { get: (name: string) => string | null }): string {
  const realIp = headerStore.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
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