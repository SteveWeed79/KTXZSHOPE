// ktxz/app/api/cart/remove/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getCartFromCookies,
  removeCartItem,
  saveCartToCookies,
} from "@/lib/cartCookie";

export const runtime = "nodejs";

function redirectBack(req: Request) {
  const referer = req.headers.get("referer");
  // If referer exists, send them back there; otherwise default to /cart
  return NextResponse.redirect(referer || "/cart", { status: 303 });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const cardId = String(form.get("cardId") || "").trim();

  // Always redirect back; if no cardId, no-op
  if (!cardId) {
    return redirectBack(req);
  }

  const cookieStore = await cookies();
  const cart = getCartFromCookies(cookieStore);

  removeCartItem(cart, cardId);
  saveCartToCookies(cookieStore, cart);

  return redirectBack(req);
}
