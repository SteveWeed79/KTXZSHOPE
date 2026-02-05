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
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { updateCartItem } from "@/lib/cartHelpers";

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
    const session = await auth();
    const userId = session?.user ? (session.user as any).id : null;

    const form = await req.formData();

    const cardId = String(form.get("cardId") || "").trim();
    const qtyRaw = form.get("qty") ?? form.get("quantity");
    const requestedQty = toPositiveInt(qtyRaw, 1);

    if (!cardId) {
      return redirectToCart(req, "error=missing-cardId");
    }

    await dbConnect();

    const card = await Card.findById(cardId).lean();
    if (!card) return redirectToCart(req, "error=missing-item");

    const inventoryType = ((card as any).inventoryType || "single") as "single" | "bulk";
    const stockRaw = (card as any).stock;
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