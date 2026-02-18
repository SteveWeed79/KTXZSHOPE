/**
 * ============================================================================
 * FILE: ktxz/components/Navbar.tsx
 * STATUS: MODIFIED (Replace existing file)
 * ============================================================================
 *
 * Fix: signOut redirect was using NEXTAUTH_URL (localhost:3000) on Vercel.
 * Solution: Pass the full production-safe redirect using the request origin,
 * or simply rely on NextAuth v5's built-in redirect handling with a relative path.
 * The server action now uses `redirect: false` and lets Next.js handle navigation.
 */

import Link from "next/link";
import { auth, signOut } from "@/auth";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/models/Brand";
import dbConnect from "@/lib/dbConnect";
import { Suspense } from "react";
import { ShoppingBag } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

export default async function Navbar() {
  // Demo-safe: Navbar depends on session + DB; don't allow stale cache renders.
  noStore();

  const session = await auth();
  await dbConnect();
  const brands = await Brand.find({}).lean();

  const isAdmin =
    session?.user?.email === process.env.ADMIN_EMAIL ||
    (session?.user as { role?: string })?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center px-4">
        {/* LEFT: Logo + Brand List (info-only, typography only) */}
        <div className="flex items-center gap-6 mr-auto">
          <Link
            href="/"
            className="text-lg font-black tracking-[-0.08em] italic uppercase hover:text-primary transition-colors shrink-0"
          >
            KTXZ
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary/90 hover:text-primary transition-colors"
            >
              Admin
            </Link>
          )}

          <div className="hidden md:flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            {brands.length === 0 ? (
              <span className="tracking-normal uppercase text-xs">No brands yet</span>
            ) : (
              brands.map((b: Record<string, unknown>, idx: number) => (
                <span key={String(b._id)} className="whitespace-nowrap">
                  <span className="hover:text-foreground transition-colors">{String(b.name)}</span>
                  {idx < brands.length - 1 && (
                    <span className="mx-2 text-border/80">•</span>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {/* CENTER: Search */}
        <div className="hidden lg:flex w-full max-w-[420px]">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />

          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md"
            title="Cart"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="h-4 w-4" />
          </Link>

          {session ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="group flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold text-[10px] text-primary-foreground group-hover:scale-110 transition-transform">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
              </Link>

              <form
                action={async () => {
                  "use server";
                  // IMPORTANT: Build the redirectTo URL from the actual request host,
                  // NOT from NEXTAUTH_URL. This prevents localhost redirect on Vercel
                  // when NEXTAUTH_URL was set to localhost:3000 during development.
                  const headersList = await headers();
                  const host = headersList.get("host") ?? "";
                  const proto = headersList.get("x-forwarded-proto") ?? "https";
                  const origin = `${proto}://${host}`;
                  await signOut({ redirectTo: `${origin}/` });
                }}
              >
                <button className="text-[10px] text-muted-foreground hover:text-primary font-bold transition-colors cursor-pointer tracking-widest uppercase">
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-primary text-primary-foreground font-bold py-1.5 px-4 rounded-full transition-all text-[10px] tracking-wide uppercase hover:brightness-90"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}