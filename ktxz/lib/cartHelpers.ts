/**
 * ============================================================================
 * FILE: ktxz/lib/cartHelpers.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Unified cart operations for both DB carts (logged-in users) and cookie carts (guests)
 * 
 * IMPORTANT: This abstracts away the differences between user/guest carts
 * so the rest of the app can use a single consistent API.
 */

import { cookies } from "next/headers";
import mongoose from "mongoose";
import Cart from "@/models/Cart";
import dbConnect from "@/lib/dbConnect";
import {
  getCartFromCookies,
  saveCartToCookies,
  setCartItem as setCookieCartItem,
  removeCartItem as removeCookieCartItem,
  clearCart as clearCookieCart,
  type CookieCart,
} from "@/lib/cartCookie";

export type CartItem = {
  cardId: string;
  qty: number;
};

export type UnifiedCart = {
  id?: string; // Cookie cart ID (for guest reservations)
  items: CartItem[];
  source: "database" | "cookie";
};

/**
 * Load cart based on user session
 * - If logged in: Load from database
 * - If guest: Load from cookie
 */
export async function loadCart(userId: string | null): Promise<UnifiedCart> {
  await dbConnect();

  if (userId) {
    // Logged-in user: load from database
    const dbCart = await Cart.findOne({ user: userId }).lean();

    if (dbCart) {
      return {
        items: dbCart.items.map((item: any) => ({
          cardId: String(item.card),
          qty: Number(item.quantity || 1),
        })),
        source: "database",
      };
    }

    // User exists but no cart yet - return empty
    return { items: [], source: "database" };
  }

  // Guest: load from cookie
  const cookieStore = await cookies();
  const cookieCart = getCartFromCookies(cookieStore);

  return {
    id: cookieCart.id, // IMPORTANT: Preserve cookie cart ID for reservations
    items: cookieCart.items.map((item) => ({
      cardId: item.cardId,
      qty: item.qty,
    })),
    source: "cookie",
  };
}

/**
 * Get current quantity of a specific item in cart (0 if not in cart)
 */
export async function getCartItemQuantity(
  userId: string | null,
  cardId: string
): Promise<number> {
  const cart = await loadCart(userId);
  const item = cart.items.find((it) => it.cardId === cardId);
  return item ? item.qty : 0;
}

/**
 * Set item quantity in cart (replaces existing quantity)
 * Used when you want to set an exact quantity (not increment)
 */
export async function setCartItemQuantity(
  userId: string | null,
  cardId: string,
  qty: number
): Promise<void> {
  await dbConnect();

  if (userId) {
    // Database cart
    const cart = await Cart.findOne({ user: userId });

    if (cart) {
      // Cart exists - update or add item
      const existingIndex = cart.items.findIndex(
        (item: any) => String(item.card) === cardId
      );

      if (existingIndex >= 0) {
        // Update existing item
        cart.items[existingIndex].quantity = qty;
      } else {
        // Add new item
        cart.items.push({
          card: new mongoose.Types.ObjectId(cardId),
          quantity: qty,
        });
      }

      cart.lastActiveAt = new Date();
      await cart.save();
    } else {
      // Create new cart
      await Cart.create({
        user: new mongoose.Types.ObjectId(userId),
        items: [
          {
            card: new mongoose.Types.ObjectId(cardId),
            quantity: qty,
          },
        ],
        lastActiveAt: new Date(),
      });
    }
  } else {
    // Cookie cart
    const cookieStore = await cookies();
    const cart = getCartFromCookies(cookieStore);
    setCookieCartItem(cart, cardId, qty);
    saveCartToCookies(cookieStore, cart);
  }
}

/**
 * Update item quantity in cart
 * IMPORTANT: This is used by the update route, sets to exact quantity
 */
export async function updateCartItem(
  userId: string | null,
  cardId: string,
  qty: number
): Promise<void> {
  await setCartItemQuantity(userId, cardId, qty);
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string | null,
  cardId: string
): Promise<void> {
  await dbConnect();

  if (userId) {
    // Database cart
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return;

    cart.items = cart.items.filter((item: any) => String(item.card) !== cardId);
    cart.lastActiveAt = new Date();
    await cart.save();
  } else {
    // Cookie cart
    const cookieStore = await cookies();
    const cart = getCartFromCookies(cookieStore);
    removeCookieCartItem(cart, cardId);
    saveCartToCookies(cookieStore, cart);
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string | null): Promise<void> {
  await dbConnect();

  if (userId) {
    // Database cart
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      cart.lastActiveAt = new Date();
      await cart.save();
    }
  } else {
    // Cookie cart
    const cookieStore = await cookies();
    const cart = getCartFromCookies(cookieStore);
    clearCookieCart(cart);
    saveCartToCookies(cookieStore, cart);
  }
}

/**
 * Merge cookie cart into user's database cart (called on login)
 * - Takes all items from cookie
 * - Adds/updates them in database cart
 * - Clears the cookie
 */
export async function mergeCookieCartIntoUserCart(userId: string): Promise<void> {
  await dbConnect();

  const cookieStore = await cookies();
  const cookieCart = getCartFromCookies(cookieStore);

  if (cookieCart.items.length === 0) return; // Nothing to merge

  // Load or create user cart
  let userCart = await Cart.findOne({ user: userId });

  if (!userCart) {
    // Create new cart with cookie items
    await Cart.create({
      user: new mongoose.Types.ObjectId(userId),
      items: cookieCart.items.map((item) => ({
        card: new mongoose.Types.ObjectId(item.cardId),
        quantity: item.qty,
      })),
      lastActiveAt: new Date(),
    });
  } else {
    // Merge cookie items into existing cart
    for (const cookieItem of cookieCart.items) {
      const existingIndex = userCart.items.findIndex(
        (item: any) => String(item.card) === cookieItem.cardId
      );

      if (existingIndex >= 0) {
        // Item exists - keep higher quantity
        const existing = userCart.items[existingIndex];
        existing.quantity = Math.max(existing.quantity, cookieItem.qty);
      } else {
        // New item - add it
        userCart.items.push({
          card: new mongoose.Types.ObjectId(cookieItem.cardId),
          quantity: cookieItem.qty,
        });
      }
    }

    userCart.lastActiveAt = new Date();
    await userCart.save();
  }

  // Clear cookie cart after successful merge
  clearCookieCart(cookieCart);
  saveCartToCookies(cookieStore, cookieCart);
}