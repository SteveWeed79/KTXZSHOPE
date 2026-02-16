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
 * Uses the same trust order as rate limiting: x-vercel-forwarded-for > x-real-ip > x-forwarded-for
 */
function extractRequestContext(req?: Request) {
  if (!req) return { ipAddress: "", userAgent: "" };

  // Prefer Vercel's header (cannot be spoofed), then x-real-ip, then x-forwarded-for
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress =
    (vercelIp ? vercelIp.split(",")[0].trim() : "") ||
    (realIp ? realIp.trim() : "") ||
    (forwarded ? forwarded.split(",").pop()?.trim() || "" : "");
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
