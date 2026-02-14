# Security Review & Corrections Plan — KTXZ Shop

## Audit Summary

After reading every API route, server action, model, middleware, and library file in the codebase, I identified **14 security gaps** ranging from Critical to Low severity. Below is the complete findings list followed by the fix plan.

---

## Findings

### CRITICAL

**1. NoSQL Injection in Search Page** (`app/search/page.tsx:27-31`)
- User-supplied query string `q` is passed directly into MongoDB `$regex` without escaping
- An attacker can inject regex metacharacters (e.g., `.*`, `^`, `$`) or craft ReDoS patterns to crash the server
- **Fix:** Escape regex special characters before interpolation, or use `$text` search

**2. Cron Endpoint Open When CRON_SECRET Is Not Set** (`app/api/cron/cleanup-reservations/route.ts:18-24`)
- If `CRON_SECRET` env var is not configured, the auth check is skipped entirely — anyone can hit the endpoint
- **Fix:** Require the secret always; return 401 if CRON_SECRET is not configured

**3. Checkout Success Page — Unauthenticated Stripe Session Access** (`app/checkout/success/page.tsx:65`)
- Any user who knows/guesses a `session_id` can view order details and trigger cart clearing
- The `session_id` is passed from URL searchParams directly to `stripe.checkout.sessions.retrieve()` with no ownership validation
- **Fix:** Validate that the Stripe session's email/userId matches the current user, or that it's the user's own session

### HIGH

**4. Password Reset Has No Validation on New Password** (`app/login/resetActions.ts:59-78`)
- `resetPassword()` does not enforce any password complexity (unlike `signUp` which validates)
- A user resetting their password can set `"a"` as their new password
- **Fix:** Apply the same password regex validation used in `signUp`

**5. Missing Rate Limiting on Server Actions** (multiple files)
- `signUp` (`app/login/userActions.ts`) — no rate limiting, vulnerable to credential stuffing/brute-force registration
- `requestPasswordReset` (`app/login/resetActions.ts`) — no rate limiting, enables email bombing
- `resetPassword` — no rate limiting on token attempts
- `addToCart` (`app/card/[id]/cartActions.ts`) — no rate limiting
- All admin actions (`app/admin/actions.ts`) — no rate limiting
- **Fix:** Add rate limiting to these server actions (especially auth-related ones)

**6. Rate Limiter IP Spoofing via X-Forwarded-For** (`lib/rateLimit.ts:13-21`)
- Rate limiting uses `x-forwarded-for` header which can be trivially spoofed by clients if there's no trusted proxy configuration
- An attacker can bypass all rate limits by rotating the header value
- **Fix:** Use a more reliable identifier; document that a trusted reverse proxy must strip/set the header

**7. Webhook Error Leaks Internal Details** (`app/api/stripe/webhook/route.ts:398`)
- The catch block returns `err.message` directly to the caller: `{ error: err?.message || "Webhook error" }`
- This can leak stack traces, database errors, or internal paths
- **Fix:** Return a generic error message; log the details server-side only

### MEDIUM

**8. Missing Content-Security-Policy Header** (`next.config.ts`)
- The app sets X-Frame-Options, HSTS, etc., but no CSP header
- Without CSP, if an XSS vector is found, there's no defense-in-depth to prevent script execution
- **Fix:** Add a Content-Security-Policy header

**9. Duplicate `requireAdmin` Implementations** (`lib/requireAdmin.ts` vs `lib/authHelpers.ts`)
- Two different `requireAdmin()` functions exist with slightly different signatures/return types
- Routes inconsistently use one or the other; the `app/api/orders/send-email/route.ts` inlines its own admin check
- This increases the risk of authorization bypass through using the wrong one
- **Fix:** Consolidate to a single implementation

**10. Admin Orders Endpoint Has No Pagination** (`app/api/admin/orders/route.ts:24`)
- `Order.find({})` with no limit fetches ALL orders into memory
- With enough orders this is a denial-of-service vector (memory exhaustion)
- **Fix:** Add pagination (limit/skip or cursor-based)

**11. Seed Endpoint NODE_ENV Check Is Fragile** (`app/api/seed/route.ts:9`)
- The check `process.env.NODE_ENV === "production"` can be bypassed if NODE_ENV isn't explicitly set to "production"
- It falls through to admin auth check, but the double-gate is inconsistent
- **Fix:** Default to blocked unless explicitly in development mode

**12. Email Template HTML Injection Risk** (`app/login/resetActions.ts:43`)
- The password reset email embeds `resetLink` directly in HTML without escaping
- While the token is hex-safe, the `NEXTAUTH_URL` env var could contain characters that break out of the HTML attribute
- **Fix:** HTML-encode the URL in the template

### LOW

**13. signUp Server Action Missing Email Validation** (`app/login/userActions.ts:9-11`)
- Email is taken from `formData.get("email")` with only `.toLowerCase()` applied
- No format validation (could store malformed emails in DB)
- **Fix:** Add basic email format validation

**14. Mongoose ObjectId Passed Unchecked in Several Admin Actions** (`app/admin/actions.ts`)
- `deleteBrand`, `deleteCard`, `updateVaultStatus`, `removeFromVault` all take IDs from formData without validating they are valid ObjectIds
- Invalid IDs cause unhandled Mongoose CastErrors
- **Fix:** Validate ObjectId format before database operations

---

## Implementation Plan

### Phase 1: Critical Fixes

#### Fix 1 — Escape regex in search
**File:** `ktxz/app/search/page.tsx`
- Add a `escapeRegex()` helper that escapes all regex metacharacters
- Apply it to the `q` value before using it in `$regex`

#### Fix 2 — Require CRON_SECRET always
**File:** `ktxz/app/api/cron/cleanup-reservations/route.ts`
- If `CRON_SECRET` is not set, return 401 immediately instead of skipping the check

#### Fix 3 — Validate session ownership on checkout success
**File:** `ktxz/app/checkout/success/page.tsx`
- After retrieving the Stripe session, verify the session email matches the current user's email (or allow if just paid, since the webhook handles the real work)
- At minimum, don't expose full session ID in the UI

### Phase 2: High Fixes

#### Fix 4 — Add password validation to resetPassword
**File:** `ktxz/app/login/resetActions.ts`
- Extract the password regex from `signUp` into a shared constant
- Apply the same validation in `resetPassword` before hashing

#### Fix 5 — Add rate limiting to server actions
**Files:** `ktxz/app/login/userActions.ts`, `ktxz/app/login/resetActions.ts`, `ktxz/app/card/[id]/cartActions.ts`
- Create a server-action-compatible rate limiter (using headers from next/headers)
- Apply strict rate limiting (5/min) to `signUp`, `requestPasswordReset`, `resetPassword`
- Apply standard rate limiting (15/min) to `addToCart`

#### Fix 6 — Document/harden rate limit IP extraction
**File:** `ktxz/lib/rateLimit.ts`
- Add a comment documenting the trusted proxy requirement
- Prefer `x-real-ip` over `x-forwarded-for` when both are present (x-real-ip is typically set by the proxy itself)

#### Fix 7 — Stop leaking error details from webhook
**File:** `ktxz/app/api/stripe/webhook/route.ts`
- Change the outer catch to return a generic `"Internal server error"` message
- Keep the `console.error` for server-side logging

### Phase 3: Medium Fixes

#### Fix 8 — Add Content-Security-Policy header
**File:** `ktxz/next.config.ts`
- Add a CSP header with `default-src 'self'`, allowing necessary sources (Stripe JS, Google OAuth, image CDNs)

#### Fix 9 — Consolidate requireAdmin
**Files:** `ktxz/lib/authHelpers.ts`, `ktxz/lib/requireAdmin.ts`, `ktxz/app/api/orders/send-email/route.ts`
- Keep `lib/requireAdmin.ts` as the canonical implementation (returns NextResponse for API routes)
- Keep `lib/authHelpers.ts` `isAdmin()` helper but remove its duplicate `requireAdmin()`
- Update `app/api/orders/send-email/route.ts` to use the shared `requireAdmin()`

#### Fix 10 — Add pagination to admin orders
**File:** `ktxz/app/api/admin/orders/route.ts`
- Accept `page` and `limit` query params (default limit=50)
- Apply `.skip()` and `.limit()` to the query

#### Fix 11 — Harden seed endpoint
**File:** `ktxz/app/api/seed/route.ts`
- Change to block unless `NODE_ENV === "development"` explicitly

#### Fix 12 — HTML-encode email template URLs
**File:** `ktxz/app/login/resetActions.ts`
- Encode the reset link URL for safe HTML attribute embedding

### Phase 4: Low Fixes

#### Fix 13 — Validate email format in signUp
**File:** `ktxz/app/login/userActions.ts`
- Add a basic email regex check before database operations

#### Fix 14 — Validate ObjectIds in admin actions
**File:** `ktxz/app/admin/actions.ts`
- Add `mongoose.Types.ObjectId.isValid()` checks before `findById`/`findByIdAndDelete` calls
