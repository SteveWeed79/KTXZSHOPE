// ktxz/app/api/cart/route/remove/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { getCartFromCookies, removeCartItem, saveCartToCookies } from "@/lib/cartCookie";

export const runtime = "nodejs";

function redirectBack(req: Request) {
  const referer = req.headers.get("referer");
  // keep prior behavior: go back if possible, otherwise /cart
  return NextResponse.redirect(referer || new URL("/cart", req.url), { status: 303 });
}

/**
 * saveCartToCookies() expects a "RequestCookies-like" setter.
 * NextResponse has its own cookie jar (ResponseCookies) which *can* set cookies.
 * We adapt it locally to avoid changing the shared helper signature.
 */
function asCookieSetter(cookieJar: unknown): Pick<RequestCookies, "set"> {
  return cookieJar as unknown as Pick<RequestCookies, "set">;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const cardId = String(form.get("cardId") || "").trim();

  // If no cardId, no-op and redirect back
  if (!cardId) {
    return redirectBack(req);
  }

  // Read cart from request cookies
  const cookieStore = await cookies();
  const cart = getCartFromCookies(cookieStore);

  // Update cart in-memory
  removeCartItem(cart, cardId);

  // Redirect response + set cookie on the response cookie jar
  const res = redirectBack(req);
  saveCartToCookies(asCookieSetter(res.cookies), cart);

  return res;
}
