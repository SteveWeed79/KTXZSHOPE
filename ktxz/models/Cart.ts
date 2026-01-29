//ktxz/models/Cart.ts
import mongoose, { Schema, models, model } from "mongoose";

const CartItemSchema = new Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    // If logged in, we attach to a user. If guest, this is null and we use guestId.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // For guest carts we store a signed/opaque id in a cookie and save it here.
    guestId: { type: String, required: false, index: true },

    items: { type: [CartItemSchema], default: [] },

    // Optional: track last activity for cleanup jobs later
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure we never have multiple carts per user
CartSchema.index({ user: 1 }, { unique: true, sparse: true });

// Ensure we never have multiple carts per guestId
CartSchema.index({ guestId: 1 }, { unique: true, sparse: true });

const Cart = models.Cart || model("Cart", CartSchema);

export default Cart;
