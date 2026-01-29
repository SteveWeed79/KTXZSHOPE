import Link from "next/link";
import { auth, signOut } from "@/auth";
import SearchBar from "@/components/SearchBar";
import Brand from "@/models/Brand";
import dbConnect from "@/lib/dbConnect";
import { Suspense } from "react";

export default async function Navbar() {
  const session = await auth();
  await dbConnect();
  const brands = await Brand.find({}).lean();

  return (
    <nav className="border-b border-gray-900 p-4 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-8">
        {/* LOGO & ADMIN BADGE */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-2xl font-black tracking-tighter hover:text-red-600 transition-colors italic uppercase"
          >
            KTXZ
          </Link>

          {(session?.user?.email === "steveweed1979@gmail.com" ||
            (session?.user as any)?.role === "admin") && (
            <Link
              href="/admin"
              className="text-[9px] text-red-500 font-bold border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition-all tracking-tighter uppercase"
            >
              System Admin
            </Link>
          )}
        </div>

        {/* SEARCH */}
        <div className="flex-1 flex justify-center max-w-md">
          <Suspense
            fallback={<div className="w-full h-10 bg-gray-900 animate-pulse rounded-xl" />}
          >
            <SearchBar />
          </Suspense>
        </div>

        {/* NAV LINKS & AUTH */}
        <div className="flex gap-8 items-center">
          <div className="hidden xl:flex gap-6 font-bold text-[10px] tracking-[0.2em] items-center text-gray-400">
            {brands.map((brand: any) => (
              <Link
                key={brand._id.toString()}
                href={`/menu/${brand.slug}`}
                className="hover:text-white transition-colors uppercase"
              >
                {brand.name}
              </Link>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-gray-800 hidden xl:block" />

          {/* CART LINK */}
          <Link
            href="/cart"
            className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 hover:text-white transition-colors"
          >
            Cart
          </Link>

          {session ? (
            <div className="flex items-center gap-6">
              <Link href="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-black text-[10px] text-white border border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.3)] group-hover:scale-110 transition-transform">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors hidden sm:inline">
                  Account
                </span>
              </Link>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-[10px] text-gray-600 hover:text-red-600 uppercase font-bold transition-colors cursor-pointer">
                  Terminate Session [Logoff]
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="btn-primary">
                Access Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
