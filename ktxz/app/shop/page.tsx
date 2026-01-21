import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";

export default async function Home() {
  await dbConnect();

  // Query for Vault items that are currently active based on system time
  const now = new Date();
  const vaultCards = await Card.find({
    isVault: true,
    vaultReleaseDate: { $lte: now }, 
    $or: [
      { vaultExpiryDate: { $gte: now } }, 
      { vaultExpiryDate: null } 
    ]
  }).populate('brand').limit(2).lean();

  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      {/* HERO SECTION */}
      <div className="py-20 space-y-6">
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter italic uppercase">
          KTXZ<span className="text-red-600">SHOPE</span>
        </h1>
        <p className="text-gray-500 font-mono tracking-[0.3em] uppercase text-xs">
          Elite Trading Card Acquisitions // Global Sector
        </p>
        
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/shop" className="btn-primary">Enter Marketplace</Link>
          <Link href="/login" className="btn-black">Access Identity</Link>
        </div>
      </div>

      {/* THE VAULT: This section "absorbs" if vaultCards is empty */}
      {vaultCards.length > 0 && (
        <section className="w-full bg-black border-t border-gray-900 py-20 mt-20">
          <h2 className="text-xs font-black uppercase tracking-[0.5em] text-red-600 mb-12">
            The Vault // Active Drops
          </h2>
          <div className="flex justify-center gap-8 max-w-5xl mx-auto">
            {vaultCards.map((card: any) => (
              <Link key={card._id.toString()} href={`/card/${card._id}`} className="group">
                 <div className="w-64 aspect-[2.5/3.5] bg-gray-900 border border-red-600/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.1)] group-hover:border-red-600 transition-all">
                    <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                 </div>
                 <h3 className="mt-4 font-bold uppercase italic">{card.name}</h3>
                 <p className="text-red-600 font-mono">${card.price}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* BACKGROUND GLOW */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-full max-w-4xl h-96 bg-red-600/5 blur-[120px] rounded-full" />
    </main>
  );
}