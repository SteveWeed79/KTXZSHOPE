/**
 * ============================================================================
 * FILE: ktxz/app/api/cart/update/route.ts
 * STATUS: MODIFIED (Database cart support)
 * ============================================================================
 * 
 * Update cart item quantity
 * - Supports both database carts (logged-in) and cookie carts (guests)
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { updateCartItem } from "@/lib/cartHelpers";
import { RateLimiters, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

function redirectToCart(req: Request, query?: string) {
  const url = new URL("/cart", req.url);
  if (query) url.search = query.startsWith("?") ? query : `?${query}`;
  return NextResponse.redirect(url, { status: 303 });
}

function toPositiveInt(value: unknown, fallback = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

export async function POST(req: Request) {
  try {
    // Rate limit: 30 cart updates per minute per IP
    const rl = await RateLimiters.standard.check(req, 30);
    if (!rl.success) return rateLimitResponse(rl);

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const form = await req.formData();

    const cardId = String(form.get("cardId") || "").trim();
    const qtyRaw = form.get("qty") ?? form.get("quantity");
    const requestedQty = toPositiveInt(qtyRaw, 1);

    if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
      return redirectToCart(req, "error=missing-cardId");
    }

    // Cap quantity at 99 to prevent abuse
    if (requestedQty > 99) {
      return redirectToCart(req, "error=invalid-quantity");
    }

    await dbConnect();

    const card = await Card.findById(cardId).lean();
    if (!card) return redirectToCart(req, "error=missing-item");

    const inventoryType = ((card as Record<string, unknown>).inventoryType || "single") as "single" | "bulk";
    const stockRaw = (card as Record<string, unknown>).stock;
    const stock = typeof stockRaw === "number" && Number.isFinite(stockRaw) ? Math.trunc(stockRaw) : 0;

    let finalQty = 1;

    if (inventoryType === "single") {
      finalQty = 1;
    } else {
      // bulk: clamp to available stock
      const maxQty = Math.max(0, stock);
      finalQty = Math.min(requestedQty, Math.max(1, maxQty || 1));
    }

    // Update cart (handles both database and cookie)
    await updateCartItem(userId, cardId, finalQty);

    return redirectToCart(req);
  } catch (err) {
    console.error("Cart update error:", err);
    return redirectToCart(req, "error=cart-update-failed");
  }
}