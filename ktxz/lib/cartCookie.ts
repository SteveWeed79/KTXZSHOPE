// ktxz/lib/cartCookie.ts
import crypto from "crypto";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

export const CART_COOKIE = "ktxz_cart_v1";

export type CookieCartItem = {
  cardId: string;
  qty: number;
};

export type CookieCart = {
  id: string;
  items: CookieCartItem[];
  updatedAt: number; // unix ms
};

type LegacyCartItem = {
  cardId: string;
  quantity?: number;
};

/** -------------------------
 *  Pure helpers (no I/O)
 *  ------------------------- */

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function newCart(now = Date.now()): CookieCart {
  return {
    id: crypto.randomBytes(16).toString("hex"),
    items: [],
    updatedAt: now,
  };
}

/**
 * Accepts:
 *  - canonical object cart: { id, items:[{cardId, qty}], updatedAt }
 *  - legacy array cart: [{ cardId, quantity }]
 *
 * Returns canonical CookieCart or null if un-parseable.
 */
export function parseCartCookieValue(raw: string | undefined): CookieCart | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const now = Date.now();

  // Legacy: array of { cardId, quantity }
  if (Array.isArray(parsed)) {
    const legacyItems = parsed as LegacyCartItem[];

    const items: CookieCartItem[] = legacyItems
      .filter((x) => x && typeof x.cardId === "string" && x.cardId.trim().length > 0)
      .map((x) => ({
        cardId: String(x.cardId).trim(),
        qty: clamp(toInt(x.quantity, 1), 1, 999),
      }));

    const cart = newCart(now);
    cart.items = items;
    cart.updatedAt = now;
    return cart;
  }

  // Canonical-ish: object
  if (typeof parsed !== "object" || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : "";
  const updatedAt = toInt(obj.updatedAt, now);

  const rawItems = obj.items;
  if (!Array.isArray(rawItems)) return null;

  const items: CookieCartItem[] = rawItems
    .filter((x) => typeof x === "object" && x !== null)
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.cardId === "string" && x.cardId.trim().length > 0)
    .map((x) => ({
      cardId: String(x.cardId).trim(),
      qty: clamp(toInt(x.qty, 1), 1, 999),
    }));

  return {
    id: id || newCart(now).id,
    items,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
  };
}

export function setCartItem(
  cart: CookieCart,
  cardId: string,
  qty: number,
  now = Date.now()
): CookieCart {
  const cleanId = (cardId || "").trim();
  if (!cleanId) return cart;

  const nextQty = clamp(toInt(qty, 1), 1, 999);

  const idx = cart.items.findIndex((it) => it.cardId === cleanId);
  if (idx >= 0) {
    cart.items[idx] = { cardId: cleanId, qty: nextQty };
  } else {
    cart.items.push({ cardId: cleanId, qty: nextQty });
  }

  cart.updatedAt = now;
  return cart;
}

export function removeCartItem(cart: CookieCart, cardId: string, now = Date.now()): CookieCart {
  const cleanId = (cardId || "").trim();
  if (!cleanId) return cart;

  cart.items = cart.items.filter((it) => it.cardId !== cleanId);
  cart.updatedAt = now;
  return cart;
}

export function clearCart(cart: CookieCart, now = Date.now()): CookieCart {
  cart.items = [];
  cart.updatedAt = now;
  return cart;
}

/** -------------------------
 *  Cookie I/O helpers
 *  ------------------------- */

type CookieWriteOptions = {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  path: string;
  maxAge: number;
};

function cookieOptions(): CookieWriteOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * Read + normalize the cart from a Next cookies() store.
 * If missing/invalid, returns a fresh empty cart.
 */
export function getCartFromCookies(cookieStore: Pick<RequestCookies, "get">): CookieCart {
  const raw = cookieStore.get(CART_COOKIE)?.value;
  return parseCartCookieValue(raw) ?? newCart();
}

/**
 * Persist a canonical cart back into the cookie.
 */
export function saveCartToCookies(
  cookieStore: Pick<RequestCookies, "set">,
  cart: CookieCart
): void {
  const payload: CookieCart = {
    id: cart.id || newCart().id,
    items: Array.isArray(cart.items) ? cart.items : [],
    updatedAt: Number.isFinite(cart.updatedAt) ? cart.updatedAt : Date.now(),
  };

  // Use object-form set() to support Next's differing cookie store overloads.
  cookieStore.set({
    name: CART_COOKIE,
    value: JSON.stringify(payload),
    ...cookieOptions(),
  } as any);
}

/**
 * Remove the cookie entirely.
 */
export function clearCartCookie(cookieStore: Pick<RequestCookies, "set">): void {
  // Put maxAge into a spread object so TS doesn't treat it as an "excess property"
  // on the object literal passed to the RequestCookie overload.
  const opts = { ...cookieOptions(), maxAge: 0 };

  cookieStore.set({
    name: CART_COOKIE,
    value: "",
    ...opts,
  } as any);
}
