import dbConnect from "@/lib/dbConnect";
import AuditLog from "@/models/AuditLog";

export type AuditAction =
  | "ORDER_STATUS_UPDATE"
  | "ORDER_REFUND"
  | "ORDER_TRACKING_UPDATE"
  | "ORDER_EMAIL_SENT"
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "SETTINGS_UPDATED"
  | "INVENTORY_RESTORED";

export type AuditTargetType = "order" | "user" | "settings" | "card";

interface AuditLogEntry {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Extract client IP and user agent from a request for audit purposes.
 */
function extractRequestContext(req?: Request) {
  if (!req) return { ipAddress: "", userAgent: "" };

  const realIp = req.headers.get("x-real-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = realIp || (forwarded ? forwarded.split(",")[0].trim() : "");
  const userAgent = req.headers.get("user-agent") || "";

  return { ipAddress, userAgent };
}

/**
 * Record an admin action in the audit log.
 *
 * This is fire-and-forget by default — it never throws or blocks the
 * API response. Errors are logged to console for operational monitoring.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await dbConnect();
    const { ipAddress, userAgent } = extractRequestContext(entry.req);

    await AuditLog.create({
      adminId: entry.adminId,
      adminEmail: entry.adminEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata || {},
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Never let audit logging failure break admin operations
    console.error("[AuditLog] Failed to write audit log entry:", err);
  }
}
