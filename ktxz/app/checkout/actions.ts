"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { getStripe } from "@/lib/stripe";

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

function getSiteUrl() {
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Missing NEXTAUTH_URL (or NEXT_PUBLIC_SITE_URL) env var.");
  return url.replace(/\/+$/, "");
}

export async function createCheckoutSession() {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");

  await dbConnect();

  const cookieStore = await cookies();
  const cart = safeParseCart(cookieStore.get(CART_COOKIE)?.value);
  const items = cart?.items ?? [];

  if (!cart || items.length === 0) {
    redirect("/cart");
  }

  const ids = items.map((i) => i.cardId).filter(Boolean);
  const cards = await Card.find({ _id: { $in: ids } }).populate("brand").lean();

  const cardsById = new Map<string, any>();
  for (const c of cards) cardsById.set(String(c._id), c);

  const lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
        metadata?: Record<string, string>;
      };
      unit_amount: number;
    };
    quantity: number;
  }> = [];

  for (const it of items) {
    const card = cardsById.get(it.cardId);
    if (!card) redirect("/cart?error=missing-item");

    const price = Number(card.price);
    if (!Number.isFinite(price) || price <= 0) redirect("/cart?error=bad-price");

    const isInactive = card.isActive === false || card.status === "inactive";
    const isSold = card.status === "sold";
    const inventoryType = card.inventoryType || "single";
    const isBulk = inventoryType === "bulk";
    const stock = typeof card.stock === "number" ? card.stock : 1;

    const canBuy = !isInactive && !isSold && (!isBulk || stock > 0);
    if (!canBuy) redirect("/cart?error=unavailable");

    const qty = !isBulk ? 1 : Math.max(1, Math.min(Number(it.qty || 1), stock));
    const unitAmount = Math.round(price * 100);

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: card.name,
          description: card.description || undefined,
          images: card.image ? [card.image] : undefined,
          metadata: {
            cardId: String(card._id),
            brand: card.brand?.name ? String(card.brand.name) : "",
            rarity: card.rarity ? String(card.rarity) : "",
            inventoryType: String(inventoryType),
          },
        },
        unit_amount: unitAmount,
      },
      quantity: qty,
    });
  }

  const siteUrl = getSiteUrl();
  const session = await auth();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    allow_promotion_codes: true,

    customer_email: session?.user?.email || undefined,

    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["US"] },
    automatic_tax: { enabled: true },

    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Standard Shipping",
          type: "fixed_amount",
          fixed_amount: { amount: 899, currency: "usd" },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
      {
        shipping_rate_data: {
          display_name: "Local Pickup",
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
        },
      },
    ],

    metadata: {
      cartId: cart.id,
      source: "ktxz_checkout",
      userId: (session?.user as any)?.id ? String((session?.user as any).id) : "",
    },

    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
  });

  if (!checkoutSession.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(checkoutSession.url);
}
