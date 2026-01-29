"use server";

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

/**
 * MVP cart mechanism:
 * - guest cart stored as a signed cookie payload later; for now: simple JSON cookie
 * - singles: forced qty=1
 * - bulk: default qty=1 (we’ll add quantity UI next)
 *
 * Next step (immediately after): real Cart + CartItem models with DB persistence + 10-min holds.
 */

type CookieCartItem = {
  cardId: string;
  qty: number;
};

type CookieCart = {
  id: string;
  items: CookieCartItem[];
  updatedAt: number;
};

const CART_COOKIE = "ktxz_cart_v1";

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

function newCart(): CookieCart {
  return {
    id: crypto.randomBytes(16).toString("hex"),
    items: [],
    updatedAt: Date.now(),
  };
}

export async function addToCart(formData: FormData) {
  await dbConnect();

  const cardId = String(formData.get("cardId") || "").trim();
  if (!cardId) redirect("/shop");

  const card = await Card.findById(cardId).lean();
  if (!card) redirect("/shop");

  const isInactive = (card as any).isActive === false || (card as any).status === "inactive";
  const isSold = (card as any).status === "sold";
  const inventoryType = (card as any).inventoryType || "single";
  const isBulk = inventoryType === "bulk";
  const stock = typeof (card as any).stock === "number" ? (card as any).stock : 1;

  const canBuy = !isInactive && !isSold && (!isBulk || stock > 0);
  if (!canBuy) redirect(`/card/${cardId}`);

  const cookieStore = await cookies();
  const existing = safeParseCart(cookieStore.get(CART_COOKIE)?.value);
  const cart = existing ?? newCart();

  const idx = cart.items.findIndex((it) => it.cardId === cardId);

  if (idx >= 0) {
    if (!isBulk) {
      cart.items[idx].qty = 1;
    } else {
      const nextQty = cart.items[idx].qty + 1;
      cart.items[idx].qty = Math.min(nextQty, stock);
    }
  } else {
    cart.items.push({ cardId, qty: 1 });
  }

  cart.updatedAt = Date.now();

  cookieStore.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/shop");
}
