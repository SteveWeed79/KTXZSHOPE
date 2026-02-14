/**
 * Validates that all required environment variables are set at startup.
 * Call this from instrumentation.ts so failures surface immediately.
 */
export function validateEnv() {
  const required = [
    "MONGODB_URI",
    "NEXTAUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nAdd them to .env.local or your hosting provider.`
    );
  }
}

/** Get an environment variable or throw if missing. */
export function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var.`);
  return v;
}
