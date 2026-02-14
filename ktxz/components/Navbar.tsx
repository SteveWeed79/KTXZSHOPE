import Link from "next/link";
import { auth, signOut } from "@/auth";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/models/Brand";
import dbConnect from "@/lib/dbConnect";
import { Suspense } from "react";
import { ShoppingBag } from "lucide-react";

export default async function Navbar() {
  const session = await auth();
  await dbConnect();
  const brands = await Brand.find({}).lean();

  const isAdmin =
    session?.user?.email === process.env.ADMIN_EMAIL ||
    (session?.user as { role?: string })?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center px-4">
        {/* LEFT: Logo + Brand Links */}
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
              className="text-[9px] text-primary font-bold border border-primary/30 px-2 py-0.5 rounded hover:bg-primary hover:text-primary-foreground transition-all tracking-wide uppercase shrink-0"
            >
              Admin
            </Link>
          )}

          <div className="hidden xl:block h-4 w-px bg-border" />

          <div className="hidden xl:flex items-center gap-1">
            {brands.map((brand: { _id: { toString(): string }; slug: string; name: string }) => (
              <Link
                key={brand._id.toString()}
                href={`/menu/${brand.slug}`}
                className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
              >
                {brand.name}
              </Link>
            ))}
            <Link
              href="/shop"
              className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
            >
              Store
            </Link>
          </div>
        </div>

        {/* RIGHT: Search + Actions */}
        <div className="flex items-center gap-3 ml-auto">
          <Suspense
            fallback={<div className="w-[220px] h-8 bg-muted animate-pulse rounded-full" />}
          >
            <SearchBar />
          </Suspense>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <ThemeToggle />

          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md"
            title="Cart"
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
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-[10px] text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer tracking-wide uppercase">
                  Out
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
