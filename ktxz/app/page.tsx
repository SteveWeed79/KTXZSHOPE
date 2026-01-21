import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { auth } from "@/auth";

export default async function Home() {
  await dbConnect();
  
  const session = await auth();
  const userEmail = session?.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  const now = new Date();
  const vaultCards = await Card.find({
    isVault: true,
    vaultReleaseDate: { $lte: now }, 
    vaultExpiryDate: { $gt: now } 
  })
  .populate('brand')
  .sort({ vaultReleaseDate: -1 }) // Newest activations appear first
  .limit(8) // Increased limit to ensure test cards aren't pushed out
  .lean();

  return (
    <main className="min-h-[80vh] flex flex-col items-center text-center px-4 overflow-x-hidden relative">
      <div className="py-24 space-y-6 z-10">
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter italic uppercase leading-none">
          KTXZ<span className="text-red-600 font-normal">SHOPE</span>
        </h1>
        <p className="text-gray-500 font-mono tracking-[0.4em] uppercase text-[10px]">Elite Trading Card Acquisitions // Global Sector</p>
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/shop" className="btn-primary">Enter Marketplace</Link>
          <Link href={session ? "/profile" : "/login"} className="btn-black">{session ? "View Profile" : "Access Identity"}</Link>
        </div>
        {userEmail === adminEmail && (
          <div className="pt-4">
            <Link href="/admin" className="text-[10px] text-red-600 font-bold uppercase tracking-[0.3em] hover:underline">[ Command Center ]</Link>
          </div>
        )}
      </div>

      {vaultCards.length > 0 && (
        <section className="w-screen bg-black border-t border-gray-900 py-24 mt-12 relative">
          <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]"></div>
          <div className="relative z-10 max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center mb-16">
              <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-red-600 mb-2">The Vault</h2>
              <div className="h-px w-24 bg-red-600/30 mb-4"></div>
              <p className="text-xs text-gray-500 uppercase font-mono italic">Priority Acquisitions Only</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {vaultCards.map((card: any) => (
                /* Enforce portrait ratio here */
                <div key={card._id.toString()} className="w-full aspect-[2.5/3.5]">
                  <ProductCard card={card} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-0 w-full max-w-4xl h-96 bg-red-600/5 blur-[120px] rounded-full" />
    </main>
  );
}