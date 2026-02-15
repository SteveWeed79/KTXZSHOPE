"use server";

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCartItemQuantity, setCartItemQuantity } from "@/lib/cartHelpers";
import { checkActionRateLimit } from "@/lib/rateLimit";

export async function addToCart(formData: FormData) {
  // Rate limit: 30 add-to-cart per minute per IP
  const rl = await checkActionRateLimit("standard", 30, "addToCart");
  if (!rl.success) redirect("/shop?error=rate-limit");

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

  // Get user ID if logged in
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Get current quantity in cart
  const currentQty = await getCartItemQuantity(userId, cardId);

  // Check if user specified a quantity via the form (for bulk items)
  const formQty = formData.get("quantity");
  const requestedQty = formQty ? Math.max(1, Math.floor(Number(formQty))) : null;

  let newQty: number;

  if (!isBulk) {
    // Singles: always 1
    newQty = 1;
  } else if (requestedQty !== null) {
    // Bulk with explicit quantity from form: set to that quantity, capped at stock
    newQty = Math.min(requestedQty, stock);
  } else {
    // Bulk without explicit quantity: increment by 1, capped at stock
    const nextQty = currentQty + 1;
    newQty = Math.min(nextQty, stock);
  }

  await setCartItemQuantity(userId, cardId, newQty);

  redirect("/cart");
}
