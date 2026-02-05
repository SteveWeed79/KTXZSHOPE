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
import { auth } from "@/auth";
import { removeFromCart } from "@/lib/cartHelpers";

export const runtime = "nodejs";

function redirectBack(req: Request) {
  const referer = req.headers.get("referer");
  return NextResponse.redirect(referer || new URL("/cart", req.url), { status: 303 });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;

  const form = await req.formData();
  const cardId = String(form.get("cardId") || "").trim();

  if (!cardId) {
    return redirectBack(req);
  }

  // Remove from cart (handles both database and cookie)
  await removeFromCart(userId, cardId);

  return redirectBack(req);
}