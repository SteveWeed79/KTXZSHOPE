// ktxz/app/api/cart/remove/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

  const store = await cookies();
  const cart = safeParseCart(store.get(CART_COOKIE)?.value);

  if (!cart || !cardId) {
    return NextResponse.redirect(new URL("/cart", req.url));
  }

  cart.items = cart.items.filter((it) => it.cardId !== cardId);
  cart.updatedAt = Date.now();
  writeCart(cart);

  return NextResponse.redirect(new URL("/cart", req.url));
}
