# KTXZ SHOP - Project Review & Roadmap

## Project Overview

KTXZ SHOP is a trading card acquisition marketplace built with **Next.js 16**, **TypeScript**, **MongoDB/Mongoose**, **Stripe**, and **NextAuth**. It supports browsing, searching, cart management (guest + logged-in), Stripe checkout with automatic tax, order fulfillment, admin dashboard, and a "Vault" feature for time-limited product releases.

---

## Current State Summary

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| User auth (credentials + Google OAuth) | Complete | JWT sessions, bcrypt, cart merge on login |
| Product catalog & search | Complete | Brand filtering, rarity, regex search |
| Shopping cart (guest + user) | Complete | Cookie-based for guests, DB for users, unified API |
| Stripe checkout & payments | Complete | Sessions, automatic tax, address collection |
| Stripe webhook & order creation | Complete | Idempotent processing, auto-confirmation emails |
| Inventory management | Complete | Single & bulk types, stock tracking, status lifecycle |
| Vault (timed releases) | Complete | Schedule, countdown timer, auto-refresh |
| Admin dashboard | Complete | Product CRUD, brand management, vault scheduling |
| Admin order management | Complete | Status updates, tracking numbers, filtering, CSV export |
| Order confirmation emails | Complete | HTML + text via Resend |
| User profile & order history | Complete | Account info, recent orders display |

### What Needs Work

| Feature | Status | Details |
|---------|--------|---------|
| Password reset emails | Partial | Forms exist, email sending not wired up |
| Admin manual email sending | Partial | API endpoint is a placeholder stub |
| Shipping notification emails | Partial | Template created, not integrated into status flow |
| User profile editing | Missing | No name/email/password change UI or endpoints |
| Rate limiting | Partial | Utility exists in `lib/rateLimit.ts` but unused |
| Shop pagination | Missing | Only search limits to 50 results |
| Input validation | Weak | Manual validation, no schema validation library |

### Build & Code Health

- **ESLint**: 126 errors, 28 warnings (mostly `no-explicit-any` and unused vars)
- **Build**: Compiles but fails in sandbox due to Google Fonts network access (not a code issue)
- **Tests**: None — no test files, no test scripts, no test framework configured
- **Middleware**: Uses deprecated `middleware` file convention; Next.js 16 recommends `proxy`
- **Dependencies**: 1 high severity vulnerability reported by `npm audit`

---

## Roadmap: Next Steps for Completion

### Phase 1 — Code Health & Stability

These items fix existing issues and harden what's already built.

- [ ] **Fix all ESLint errors (126 errors, 28 warnings)**
  - Replace `any` types with proper interfaces in `cartHelpers.ts`, `rateLimit.ts`, `Card.ts`, `Order.ts`
  - Fix `let` → `const` issues (`mongodb.ts`, `cartHelpers.ts`)
  - Remove unused imports (`Brand.ts`, `cartHelpers.ts`, `orderConfirmation.ts`)
  - Files: `lib/cartHelpers.ts`, `lib/mongodb.ts`, `lib/rateLimit.ts`, `lib/emails/orderConfirmation.ts`, `models/Brand.ts`, `models/Card.ts`, `models/Order.ts`, plus ~20 other files with errors

- [ ] **Resolve npm audit vulnerability**
  - Run `npm audit` to identify the high-severity issue and apply fix

- [x] **Migrate from deprecated `middleware.ts` to `proxy` convention**
  - Renamed `middleware.ts` → `proxy.ts`, exported function `middleware` → `proxy`
  - Deprecation warning eliminated from build output

- [ ] **Add proper TypeScript types**
  - Review `types/` directory and ensure all shared interfaces are defined
  - Eliminate remaining `any` casts across the codebase

### Phase 2 — Complete Partial Features

These items finish functionality that's been started but not connected end-to-end.

- [ ] **Wire up password reset emails**
  - Integrate Resend into `app/forgot-password/` flow
  - Send reset token via email when user submits forgot-password form
  - Files: `app/forgot-password/page.tsx`, `app/login/resetActions.ts`

- [ ] **Implement admin manual email sending**
  - Replace placeholder in `/api/admin/orders/send-email` with Resend integration
  - Support sending order confirmation and shipping notification emails from admin UI
  - File: `app/api/orders/send-email/route.ts`

- [ ] **Integrate shipping notification emails into order status flow**
  - When admin updates order to "fulfilled" and adds tracking, auto-send shipping notification
  - Template already exists at `lib/emails/shippingNotification.ts`

- [ ] **Enable rate limiting on public API routes**
  - Apply `lib/rateLimit.ts` to login, registration, password reset, and cart endpoints
  - Prevents brute-force and abuse

- [ ] **Add pagination to shop and search pages**
  - Shop page (`app/shop/page.tsx`) should paginate results
  - Search page (`app/search/page.tsx`) currently hard-limits to 50 results

### Phase 3 — Missing Core Features

New functionality needed for a production-ready marketplace.

- [ ] **User profile management**
  - Add ability to change name, email, password from profile page
  - Create API endpoints for profile updates
  - Add password change with current-password verification
  - Files: `app/profile/page.tsx` (UI), new API routes needed

- [ ] **Input validation with schema library**
  - Add Zod for request body validation on all API routes
  - Validate cart operations, checkout, admin actions, registration
  - Prevents malformed data from reaching the database

- [ ] **Error boundaries and error pages**
  - Add Next.js `error.tsx` and `not-found.tsx` at the app level
  - Add error boundaries for client components
  - Improve user-facing error messages

- [ ] **Image upload for products**
  - Admin currently enters image URLs manually
  - Add file upload support (S3, Cloudinary, or Vercel Blob)
  - Image optimization and thumbnail generation

### Phase 4 — Testing

- [ ] **Set up test framework**
  - Install and configure Vitest (or Jest) with React Testing Library
  - Add `test` script to `package.json`
  - Configure test environment for Next.js App Router

- [ ] **Unit tests for business logic**
  - Cart helpers (`lib/cartHelpers.ts`) — merge logic, quantity validation
  - Stripe helpers (`lib/stripe.ts`) — price conversion
  - Auth helpers (`lib/authHelpers.ts`) — admin checks
  - Rate limiting (`lib/rateLimit.ts`)

- [ ] **Integration tests for API routes**
  - Cart API (`/api/cart/*`) — add, update, remove
  - Admin API (`/api/admin/orders/*`) — CRUD, status updates
  - Stripe webhook (`/api/stripe/webhook`) — order creation flow
  - Auth flow — registration, login, session

- [ ] **E2E tests for critical user flows**
  - Install Playwright or Cypress
  - Test: browse → add to cart → checkout → order confirmation
  - Test: admin login → manage products → manage orders
  - Test: register → login → view profile → view order history

### Phase 5 — Production Readiness

- [ ] **Environment & deployment documentation**
  - Document all required environment variables
  - Create setup guide for local development
  - Add deployment instructions (Vercel, Docker, etc.)

- [ ] **CI/CD pipeline**
  - GitHub Actions workflow for lint, type-check, test, build
  - Run on PRs and pushes to main

- [ ] **Monitoring & logging**
  - Add structured logging for API routes and webhook processing
  - Consider error tracking (Sentry or similar)

- [ ] **Performance optimization**
  - Audit database queries for N+1 issues
  - Add caching for brand list, popular products
  - Optimize images with Next.js Image component where not already used

- [ ] **Security hardening**
  - CSRF protection on mutation endpoints
  - Content Security Policy headers
  - Review CORS configuration
  - Ensure all user input is sanitized

---

## Priority Recommendation

For getting to a launchable state, the recommended order is:

1. **Fix ESLint errors** — immediate code health win
2. **Password reset emails** — critical auth flow gap
3. **Pagination** — needed once catalog grows
4. **Input validation (Zod)** — security baseline
5. **Error pages** — user experience baseline
6. **Testing setup + core tests** — confidence for future changes
7. **CI/CD** — prevent regressions
8. **Profile management** — expected user feature
9. **Image upload** — admin quality-of-life
10. **Production monitoring** — operational readiness
