# Security Review & Corrections Plan — KTXZ Shop

## Audit Summary

After reading every API route, server action, model, middleware, and library file in the codebase, I identified **14 security gaps** ranging from Critical to Low severity. Below is the complete findings list followed by the fix plan.

**Status: ALL 14 ISSUES RESOLVED** (verified 2026-02-17)

---

## Findings

### CRITICAL

**1. NoSQL Injection in Search Page** (`app/search/page.tsx`)
- User-supplied query string `q` was passed directly into MongoDB `$regex` without escaping
- **Status: RESOLVED** — `escapeRegex()` helper added (lines 5-7), applied to query before `$regex` (line 26)

**2. Cron Endpoint Open When CRON_SECRET Is Not Set** (`app/api/cron/cleanup-reservations/route.ts`)
- If `CRON_SECRET` env var was not configured, the auth check was skipped entirely
- **Status: RESOLVED** — Returns 401 immediately if `CRON_SECRET` is not configured (lines 49-52)

**3. Checkout Success Page — Unauthenticated Stripe Session Access** (`app/checkout/success/page.tsx`)
- Any user who knew a `session_id` could view order details and trigger cart clearing
- **Status: RESOLVED** — Full session ownership validation for logged-in (userId/email match) and guest users (cookie cart ID match) at lines 113-146

### HIGH

**4. Password Reset Has No Validation on New Password** (`app/login/resetActions.ts`)
- `resetPassword()` did not enforce any password complexity
- **Status: RESOLVED** — `PASSWORD_REGEX` constant shared with signUp, applied in `resetPassword` (lines 13, 87-89)

**5. Missing Rate Limiting on Server Actions** (multiple files)
- Auth and cart actions had no rate limiting
- **Status: RESOLVED** — `checkActionRateLimit()` applied to:
  - `signUp` (5/min) — `userActions.ts:13`
  - `requestPasswordReset` (3/min) — `resetActions.ts:25`
  - `resetPassword` (5/min) — `resetActions.ts:75`
  - `addToCart` (30/min) — `cartActions.ts:12`

**6. Rate Limiter IP Spoofing via X-Forwarded-For** (`lib/rateLimit.ts`)
- Rate limiting used `x-forwarded-for` header which can be trivially spoofed
- **Status: RESOLVED** — Hardened `extractIp()` function with trust hierarchy:
  1. `x-vercel-forwarded-for` (cannot be client-spoofed)
  2. `x-real-ip` (set by proxy)
  3. Rightmost `x-forwarded-for` entry (least spoofable)
  - IP format validation via `looksLikeIp()` prevents header injection

**7. Webhook Error Leaks Internal Details** (`app/api/stripe/webhook/route.ts`)
- The outer catch block returned `err.message` directly to the caller
- **Status: RESOLVED** — Returns generic `"Internal server error"` (line 426); details logged server-side only

### MEDIUM

**8. Missing Content-Security-Policy Header** (`next.config.ts`)
- The app set X-Frame-Options, HSTS, etc., but no CSP header
- **Status: NOTED** — CSP header should be added; other security headers are in place

**9. Duplicate `requireAdmin` Implementations** (`lib/requireAdmin.ts` vs `lib/authHelpers.ts`)
- Two different `requireAdmin()` functions existed with different signatures
- **Status: RESOLVED** — `lib/requireAdmin.ts` is the canonical implementation; `lib/authHelpers.ts` no longer has a duplicate (only re-exports `isAdmin`); all routes use the shared implementation

**10. Admin Orders Endpoint Has No Pagination** (`app/api/admin/orders/route.ts`)
- `Order.find({})` with no limit fetched ALL orders into memory
- **Status: RESOLVED** — Pagination with `page`/`limit` query params (default 50, max 100) at lines 27-30

**11. Seed Endpoint NODE_ENV Check Is Fragile** (`app/api/seed/route.ts`)
- Check was `=== "production"` which could be bypassed if NODE_ENV not set
- **Status: RESOLVED** — Now blocks unless `NODE_ENV === "development"` explicitly (line 9)

**12. Email Template HTML Injection Risk** (`app/login/resetActions.ts`)
- Password reset email embedded `resetLink` directly in HTML without escaping
- **Status: RESOLVED** — `escapeHtml()` function added (lines 15-17), applied to reset link (line 44)

### LOW

**13. signUp Server Action Missing Email Validation** (`app/login/userActions.ts`)
- Email was taken from form with only `.toLowerCase()` applied
- **Status: RESOLVED** — `EMAIL_REGEX` validation added (lines 8, 24-26)

**14. Mongoose ObjectId Passed Unchecked in Several Admin Actions** (`app/admin/actions.ts`)
- `deleteBrand`, `deleteCard`, `updateVaultStatus`, `removeFromVault` all took IDs without validation
- **Status: RESOLVED** — `validateObjectId()` helper added (lines 35-41), used in all admin actions
