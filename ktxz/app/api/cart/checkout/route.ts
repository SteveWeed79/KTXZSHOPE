// ktxz/app/api/cart/checkout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCartFromCookies } from "@/lib/cartCookie";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const cart = getCartFromCookies(cookieStore);

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return NextResponse.redirect(new URL("/cart", req.url), { status: 303 });
  }

  // Send them to your /checkout page (which uses the cookie cart + server action to start Stripe)
  return NextResponse.redirect(new URL("/checkout", req.url), { status: 303 });
}
