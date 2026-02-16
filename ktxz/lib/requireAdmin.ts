import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/isAdmin";
import { RateLimiters } from "@/lib/rateLimit";

/**
 * Admin session returned by requireAdmin — includes typed identity
 * fields for use in audit logging and permission checks.
 */
export interface AdminSession {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
    image?: string | null;
  };
}

/**
 * Shared admin authorization check for API routes.
 *
 * Returns the session if the user is an admin, or a NextResponse error.
 * Usage in API routes:
 *
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   const session = result; // AdminSession
 *
 * Optionally pass a Request to apply rate limiting:
 *
 *   const result = await requireAdmin(req, { limit: 20 });
 */
export async function requireAdmin(
  req?: Request,
  rateLimit?: { limit: number; limiter?: keyof typeof RateLimiters }
): Promise<AdminSession | NextResponse> {
  // Apply rate limiting if a request and rateLimit config were provided
  if (req && rateLimit) {
    const limiter = RateLimiters[rateLimit.limiter || "standard"];
    const rl = await limiter.check(req, rateLimit.limit);
    if (!rl.success) {
        return NextResponse.json(
          {
            error: "Too many requests",
            message: "Please try again later",
            limit: rl.limit,
            remaining: rl.remaining,
            reset: new Date(rl.reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rl.limit.toString(),
              "X-RateLimit-Remaining": rl.remaining.toString(),
              "X-RateLimit-Reset": rl.reset.toString(),
            },
          }
        );
      }
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(session.user as { email?: string; role?: string })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session as unknown as AdminSession;
}
