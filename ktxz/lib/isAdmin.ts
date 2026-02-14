/**
 * Centralized admin check used across the application.
 * A user is considered admin if their DB role is "admin"
 * OR their email matches the ADMIN_EMAIL environment variable.
 */
export function isAdminUser(user: { email?: string | null; role?: string } | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || (!!user.email && user.email === process.env.ADMIN_EMAIL);
}
