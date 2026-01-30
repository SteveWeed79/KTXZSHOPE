// ktxz/models/Reservation.ts
import mongoose, { Schema, model, models } from "mongoose";

/**
 * Inventory Reservation (Hold)
 *
 * Purpose:
 * - Support true inventory holds for BOTH:
 *   - singles (quantity will be 1)
 *   - bulk items (quantity can be > 1)
 *
 * Expiration:
 * - TTL index on expiresAt auto-deletes expired reservations.
 *   Note: Mongo TTL cleanup runs periodically, so expiration is not instantaneous.
 *
 * Lifecycle:
 * - active: counts against availability
 * - consumed: successfully converted to an order (kept for audit)
 * - cancelled: user cancelled checkout
 * - expired: timed out (may also be auto-removed by TTL)
 */

const ReservationItemSchema = new Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const ReservationSchema = new Schema(
  {
    /**
     * holderKey will be:
     * - user: String(userId)
     * - guest: stable id tied to the cart/session (e.g., cookie cart id)
     */
    holderKey: { type: String, required: true, trim: true, index: true },

    holderType: {
      type: String,
      enum: ["user", "guest"],
      required: true,
      index: true,
    },

    items: {
      type: [ReservationItemSchema],
      required: true,
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Reservation must contain at least one item.",
      },
    },

    status: {
      type: String,
      enum: ["active", "consumed", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    /**
     * When this time passes, MongoDB TTL cleanup will remove the document.
     * IMPORTANT: Do NOT set `index: true` here, because TTL index is declared below via schema.index().
     */
    expiresAt: { type: Date, required: true },

    // Optional linkage to Stripe for easy lookup/consumption
    stripeCheckoutSessionId: { type: String, default: "", index: true },

    // Optional linkage to an Order once consumed
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// TTL: expire at expiresAt
ReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helpful query indexes
ReservationSchema.index({ holderKey: 1, status: 1 });
ReservationSchema.index({ status: 1, expiresAt: 1 });

const Reservation = models.Reservation || model("Reservation", ReservationSchema);
export default Reservation;
