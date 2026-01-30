// ktxz/app/api/cart/checkout/route.ts
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

export async function POST(req: Request) {
  const store = await cookies();
  const cart = safeParseCart(store.get(CART_COOKIE)?.value);

  if (!cart || cart.items.length === 0) {
    return NextResponse.redirect(new URL("/cart", req.url));
  }

  // Send them to your /checkout page (which uses the cookie cart + server action to start Stripe)
  return NextResponse.redirect(new URL("/checkout", req.url));
}
