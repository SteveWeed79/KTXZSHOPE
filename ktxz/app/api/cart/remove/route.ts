/**
 * ============================================================================
 * FILE: ktxz/app/api/cart/remove/route.ts
 * STATUS: MODIFIED (Database cart support)
 * ============================================================================
 * 
 * Remove item from cart
 * - Supports both database carts (logged-in) and cookie carts (guests)
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { removeFromCart } from "@/lib/cartHelpers";
import { RateLimiters, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

function redirectBack(req: Request) {
  const fallback = new URL("/cart", req.url);
  const referer = req.headers.get("referer");

  // Only redirect to same-origin to prevent open redirect
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(req.url);
      if (refererUrl.origin === requestUrl.origin) {
        return NextResponse.redirect(refererUrl, { status: 303 });
      }
    } catch {
      // Invalid referer URL, fall through to default
    }
  }

  return NextResponse.redirect(fallback, { status: 303 });
}

export async function POST(req: Request) {
  try {
    // Rate limit: 30 cart removes per minute per IP
    const rl = await RateLimiters.standard.check(req, 30);
    if (!rl.success) return rateLimitResponse(rl);

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const form = await req.formData();
    const cardId = String(form.get("cardId") || "").trim();

    if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
      return redirectBack(req);
    }

    // Remove from cart (handles both database and cookie)
    await removeFromCart(userId, cardId);

    return redirectBack(req);
  } catch (err) {
    console.error("Cart remove error:", err);
    return redirectBack(req);
  }
}