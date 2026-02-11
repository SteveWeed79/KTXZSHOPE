import Link from "next/link";
import { auth, signOut } from "@/auth";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/models/Brand";
import dbConnect from "@/lib/dbConnect";
import { Suspense } from "react";

export default async function Navbar() {
  const session = await auth();
  await dbConnect();
  const brands = await Brand.find({}).lean();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-8 px-4">
        {/* LOGO & ADMIN BADGE */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter uppercase hover:text-primary transition-colors"
          >
            KTXZ
          </Link>

          {(session?.user?.email === process.env.ADMIN_EMAIL ||
            (session?.user as { role?: string })?.role === "admin") && (
            <Link
              href="/admin"
              className="text-[9px] text-primary font-bold border border-primary/30 px-2 py-1 rounded hover:bg-primary hover:text-primary-foreground transition-all tracking-tighter uppercase"
            >
              Admin
            </Link>
          )}
        </div>

        {/* SEARCH */}
        <div className="flex-1 flex justify-center max-w-md">
          <Suspense
            fallback={<div className="w-full h-10 bg-muted animate-pulse rounded-lg" />}
          >
            <SearchBar />
          </Suspense>
        </div>

        {/* NAV LINKS & AUTH */}
        <div className="flex gap-6 items-center">
          <div className="hidden xl:flex gap-5 font-bold text-[10px] tracking-[0.15em] items-center text-muted-foreground">
            {brands.map((brand: { _id: { toString(): string }; slug: string; name: string }) => (
              <Link
                key={brand._id.toString()}
                href={`/menu/${brand.slug}`}
                className="hover:text-foreground transition-colors uppercase"
              >
                {brand.name}
              </Link>
            ))}
            <Link
              href="/shop"
              className="hover:text-foreground transition-colors uppercase"
            >
              Store
            </Link>
          </div>

          <div className="h-4 w-px bg-border hidden xl:block" />

          <ThemeToggle />

          {/* CART LINK */}
          <Link
            href="/cart"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cart
          </Link>

          {session ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground group-hover:scale-110 transition-transform">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
                  Account
                </span>
              </Link>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer">
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
