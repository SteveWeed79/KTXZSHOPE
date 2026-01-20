import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link"; 
import { Suspense } from 'react';

// 1. DATA & AUTH IMPORTS
import { auth, signIn, signOut } from "@/auth"; 
import SearchBar from "@/components/SearchBar";
import Brand from "@/models/Brand"; 
import dbConnect from "@/lib/dbConnect";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KTXZ SHOP | TCG Marketplace",
  description: "The ultimate destination for Pokémon, Magic, and Yu-Gi-Oh!",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  
  // 2. SERVER DATA FETCHING
  // This happens before the page even reaches the user's browser
  const session = await auth();
  await dbConnect();
  const brands = await Brand.find({}).lean();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        
        <nav className="border-b border-gray-800 p-4 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-8">
            
            {/* ZONE 1: LOGO & ADMIN (Left) */}
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-black tracking-tighter hover:text-green-500 transition-colors">
                KTXZ
              </Link>

              {session?.user?.email === process.env.ADMIN_EMAIL && (
                <Link href="/admin" className="text-[10px] text-orange-500 font-bold border border-orange-500/50 px-2 py-1 rounded hover:bg-orange-500 hover:text-black transition-all">
                  ADMIN PANEL
                </Link>
              )}
            </div>

            {/* ZONE 2: SEARCH BAR (Middle) */}
            <div className="flex-1 flex justify-center">
              <Suspense fallback={<div className="w-full max-w-sm h-10 bg-gray-900 animate-pulse rounded-lg" />}>
                <SearchBar />
              </Suspense>
            </div>
            
            {/* ZONE 3: DYNAMIC LINKS & AUTH (Right) */}
            <div className="flex gap-6 font-bold text-xs tracking-widest items-center">
              
              {/* This maps through your MongoDB Brands collection */}
              {brands.map((brand: any) => (
                <Link 
                  key={brand._id.toString()} 
                  href={`/menu/${brand.slug}`} 
                  className="hover:text-green-400 transition-colors uppercase"
                >
                  {brand.name}
                </Link>
              ))}
              
              {/* AUTHENTICATION SECTION */}
              <div className="pl-4 border-l border-gray-800 flex items-center gap-4">
                {session ? (
                  <form action={async () => { "use server"; await signOut(); }}>
                    <button className="text-gray-500 hover:text-red-500 transition-colors uppercase font-mono text-[10px]">
                      Sign Out
                    </button>
                  </form>
                ) : (
                  <form action={async () => { "use server"; await signIn("google"); }}>
                    <button className="bg-white text-black px-3 py-1.5 rounded hover:bg-green-500 hover:text-white transition-all text-[10px]">
                      SIGN IN
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}