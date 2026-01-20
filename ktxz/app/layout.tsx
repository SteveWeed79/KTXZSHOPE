import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link"; 
import { Suspense } from 'react';
import SearchBar from "@/components/SearchBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTXZ SHOP | TCG Marketplace",
  description: "The ultimate destination for Pokémon, Magic, and Yu-Gi-Oh!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        {/* Navigation Bar */}
        <nav className="border-b border-gray-800 p-4 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-8">
            
            {/* 1. LOGO (Left) */}
            <Link href="/" className="text-2xl font-black tracking-tighter hover:text-green-500 transition-colors">
              KTXZ
            </Link>

            {/* 2. SEARCH BAR (Middle) */}
            <div className="flex-1 flex justify-center">
              <Suspense fallback={<div className="w-full max-w-sm h-10 bg-gray-900 animate-pulse rounded-lg" />}>
                <SearchBar />
              </Suspense>
            </div>
            
            {/* 3. LINKS (Right) */}
            <div className="flex gap-6 font-bold text-xs tracking-widest items-center">
              <Link href="/menu/pokemon" className="hover:text-green-400 transition-colors">POKÉMON</Link>
              <Link href="/menu/mtg" className="hover:text-green-400 transition-colors">MAGIC</Link>
              <Link href="/menu/yugioh" className="hover:text-green-400 transition-colors">YU-GI-OH!</Link>
              
              <div className="hidden md:block pl-4 border-l border-gray-800 text-[10px] text-gray-500 font-mono">
                SYSTEMS: ONLINE
              </div>
            </div>

          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}