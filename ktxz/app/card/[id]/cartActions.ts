/**
 * ============================================================================
 * FILE: ktxz/app/card/[id]/cartActions.ts
 * STATUS: MODIFIED (Database cart support with proper increment logic)
 * ============================================================================
 * 
 * Add to cart action with database support for logged-in users
 * 
 * IMPORTANT: Handles increment logic properly:
 * - Singles: Always qty 1 (even if clicked multiple times)
 * - Bulk: Increments by 1 each click (capped at stock)
 */

"use server";

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCartItemQuantity, setCartItemQuantity } from "@/lib/cartHelpers";

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

  // Get user ID if logged in
  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;

  // Get current quantity in cart
  const currentQty = await getCartItemQuantity(userId, cardId);

  let newQty: number;

  if (!isBulk) {
    // Singles: always 1
    newQty = 1;
  } else {
    // Bulk: increment by 1, capped at stock
    const nextQty = currentQty + 1;
    newQty = Math.min(nextQty, stock);
  }

  // Set the new quantity
  await setCartItemQuantity(userId, cardId, newQty);

  redirect("/shop");
}