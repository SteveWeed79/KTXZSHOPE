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

function getIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  
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