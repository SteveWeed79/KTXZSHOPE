import { Resend } from "resend";

let cachedResend: Resend | null = null;

export function getResend(): Resend {
  if (!cachedResend) {
    cachedResend = new Resend(process.env.RESEND_API_KEY);
  }
  return cachedResend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
export const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "KTXZ";
export const SITE_URL =
  process.env.NEXTAUTH_URL || process.env.SITE_URL || "http://localhost:3000";
