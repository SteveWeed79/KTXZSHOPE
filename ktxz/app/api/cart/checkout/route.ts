// ktxz/app/api/cart/checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadCart } from "@/lib/cartHelpers";
import { RateLimiters, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = await RateLimiters.standard.check(req, 10);
  if (!rl.success) return rateLimitResponse(rl);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const cart = await loadCart(userId);

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return NextResponse.redirect(new URL("/cart", req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/checkout", req.url), { status: 303 });
}
