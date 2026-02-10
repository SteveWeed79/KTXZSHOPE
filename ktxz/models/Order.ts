// ktxz/models/Order.ts
import mongoose, { Schema, models, model } from "mongoose";

const OrderItemSchema = new Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },

    // Snapshot fields (so orders remain readable even if the Card changes later)
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    brandName: { type: String, default: "" },
    rarity: { type: String, default: "" },

    unitPrice: { type: Number, required: true }, // in dollars (matches your Card.price)
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    name: { type: String, default: "" },
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "US" },
  },
  { _id: false }
);

const MoneyBreakdownSchema = new Schema(
  {
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    shipping: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// Counter collection for auto-incrementing order numbers
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model("Counter", CounterSchema);

async function getNextOrderNumber(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "orderNumber",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const num = counter.seq as number;
  return `KTXZ-${String(num).padStart(5, "0")}`;
}

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true, index: true },

    // Optional link to an account (guest orders won't have this)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    email: { type: String, required: true, lowercase: true, trim: true },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator(v: unknown[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Order must contain at least one item.",
      },
    },

    amounts: { type: MoneyBreakdownSchema, required: true },

    currency: { type: String, default: "usd" },

    // Stripe linkage
    stripeCheckoutSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    stripeCustomerId: { type: String, index: true },

    // Stripe Tax / address info
    shippingAddress: { type: AddressSchema, default: {} },
    billingAddress: { type: AddressSchema, default: {} },

    // Fulfillment + lifecycle
    status: {
      type: String,
      enum: ["pending", "paid", "fulfilled", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },

    // Admin notes / fulfillment
    trackingNumber: { type: String, default: "" },
    carrier: { type: String, default: "" },
    notes: { type: String, default: "" },

    paidAt: { type: Date },
    fulfilledAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

// Helpful indexes
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ email: 1, createdAt: -1 });

// Auto-generate orderNumber before save if not set
OrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    this.orderNumber = await getNextOrderNumber();
  }
});

const Order = models.Order || model("Order", OrderSchema);

export { getNextOrderNumber };
export default Order;
