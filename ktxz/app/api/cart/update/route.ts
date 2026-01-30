// ktxz/app/api/cart/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { getCartFromCookies, saveCartToCookies, setCartItem } from "@/lib/cartCookie";

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
    const form = await req.formData();

    const cardId = String(form.get("cardId") || "").trim();
    // accept either qty or quantity to be safe
    const qtyRaw = form.get("qty") ?? form.get("quantity");
    const requestedQty = toPositiveInt(qtyRaw, 1);

    if (!cardId) {
      return redirectToCart(req, "error=missing-cardId");
    }

    const cookieStore = await cookies();
    const cart = getCartFromCookies(cookieStore);

    // Preserve existing behavior: if item isn't already in cart, no-op
    const exists = cart.items.some((it) => it.cardId === cardId);
    if (!exists) {
      return redirectToCart(req);
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
      // bulk: clamp to available stock (preserve your existing behavior)
      const maxQty = Math.max(0, stock);
      finalQty = Math.min(requestedQty, Math.max(1, maxQty || 1));
    }

    setCartItem(cart, cardId, finalQty, Date.now());
    saveCartToCookies(cookieStore, cart);

    return redirectToCart(req);
  } catch {
    // Cart update should not hard 500 the UX
    return redirectToCart(req, "error=cart-update-failed");
  }
}
