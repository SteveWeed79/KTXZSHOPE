// ktxz/app/api/cart/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";

export const runtime = "nodejs";

const CART_COOKIE = "ktxz_cart_v1";

type CookieCartItem = { cardId: string; qty: number };
type CookieCart = { id: string; items: CookieCartItem[]; updatedAt: number };

function safeParseCart(raw: string | undefined): CookieCart | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieCart;
    if (!parsed?.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCart(cart: CookieCart) {
  const store = cookies();
  store.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST(req: Request) {
  const form = await req.formData();

  const cardId = String(form.get("cardId") || "").trim();
  // accept either qty or quantity to be safe
  const qtyRaw = form.get("qty") ?? form.get("quantity");
  const requestedQty = Math.max(1, Number(qtyRaw || 1));

  if (!cardId) {
    return NextResponse.redirect(new URL("/cart?error=missing-cardId", req.url));
  }

  const store = cookies();
  const cart = safeParseCart(store.get(CART_COOKIE)?.value);
  if (!cart) return NextResponse.redirect(new URL("/cart", req.url));

  await dbConnect();

  const card = await Card.findById(cardId).lean();
  if (!card) return NextResponse.redirect(new URL("/cart?error=missing-item", req.url));

  const inventoryType = (card as any).inventoryType || "single";
  const stock = typeof (card as any).stock === "number" ? (card as any).stock : 0;

  const idx = cart.items.findIndex((it) => it.cardId === cardId);
  if (idx < 0) return NextResponse.redirect(new URL("/cart", req.url));

  if (inventoryType === "single") {
    cart.items[idx].qty = 1;
  } else {
    // bulk: clamp to available stock
    const maxQty = Math.max(0, stock);
    cart.items[idx].qty = Math.min(requestedQty, Math.max(1, maxQty || 1));
  }

  cart.updatedAt = Date.now();
  writeCart(cart);

  return NextResponse.redirect(new URL("/cart", req.url));
}
