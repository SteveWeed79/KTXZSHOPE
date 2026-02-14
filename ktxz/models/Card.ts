import mongoose, { Schema, model, models } from "mongoose";

const CardSchema = new Schema(
  {
    // Core listing fields
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, index: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    description: { type: String },
    rarity: { type: String },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    // --- INVENTORY FIELDS ---
    // single: unique item (stock is always 1)
    // bulk: multiple quantity (stock >= 0)
    inventoryType: {
      type: String,
      enum: ["single", "bulk"],
      default: "single",
      index: true,
    },

    // For singles, stock should remain 1 while available and become 0 when sold.
    // For bulk, stock is the quantity available.
    stock: { type: Number, default: 1, min: 0 },

    // Listing lifecycle (separate from Vault)
    // active: available for purchase (subject to vault rules)
    // reserved: temporarily held for checkout
    // sold: singles sold; bulk can remain active with stock reduced
    // inactive: hidden from shop
    status: {
      type: String,
      enum: ["active", "reserved", "sold", "inactive"],
      default: "active",
      index: true,
    },

    // Soft toggle for shop visibility (admin can disable without deleting)
    isActive: { type: Boolean, default: true, index: true },

    // Reservation window for checkout holds (10 minutes)
    reservedUntil: { type: Date, default: null, index: true },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reservedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    // --- VAULT & SCHEDULING FIELDS ---
    isVault: { type: Boolean, default: false, index: true },
    // NOTE: default Date.now makes a Vault item go live immediately unless scheduled otherwise.
    vaultReleaseDate: { type: Date, default: Date.now, index: true },
    vaultExpiryDate: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Helpful compound indexes for common queries
CardSchema.index({ brand: 1, status: 1, isActive: 1 });
CardSchema.index({ isVault: 1, vaultReleaseDate: 1, vaultExpiryDate: 1 });
CardSchema.index({ status: 1, reservedUntil: 1 });

// Optional: keep singles sane at save-time
// Mongoose 9+: do NOT use `next()` in pre middleware. :contentReference[oaicite:2]{index=2}
CardSchema.pre("save", function () {
  // Never allow negative stock
  if (this.stock < 0) this.stock = 0;

  if (this.inventoryType === "single") {
    if (this.stock > 1) this.stock = 1;
    if (this.status === "sold") this.stock = 0;
  }
});

// DEV SAFETY: If Turbopack/hot reload kept an old compiled model around,
// delete it so the updated schema/middleware is used.
if (process.env.NODE_ENV !== "production") {
  const m = mongoose as typeof mongoose & { models?: Record<string, unknown> };
  if (m.models?.Card) {
    delete m.models.Card;
  }
}

const Card = models.Card || model("Card", CardSchema);
export default Card;
