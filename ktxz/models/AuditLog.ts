import mongoose, { Schema, models, model } from "mongoose";

const AuditLogSchema = new Schema(
  {
    // Who performed the action
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminEmail: { type: String, required: true, lowercase: true, index: true },

    // What action was performed
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        // Order actions
        "ORDER_STATUS_UPDATE",
        "ORDER_REFUND",
        "ORDER_TRACKING_UPDATE",
        "ORDER_EMAIL_SENT",

        // User actions
        "USER_CREATED",
        "USER_ROLE_CHANGED",

        // Settings actions
        "SETTINGS_UPDATED",

        // Inventory actions
        "INVENTORY_RESTORED",
      ],
    },

    // What resource was affected
    targetType: {
      type: String,
      required: true,
      enum: ["order", "user", "settings", "card"],
    },
    targetId: { type: String, required: true, index: true },

    // Details about the change
    metadata: { type: Schema.Types.Mixed, default: {} },

    // Request context
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

// Query indexes for investigation
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ adminEmail: 1, createdAt: -1 });

const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);

export default AuditLog;
