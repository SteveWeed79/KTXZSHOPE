import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;

  // We use .populate('brand') to get the brand name instead of just the ID
  const card = await Card.findById(id).populate('brand');

  if (!card) notFound();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24">
      <div className="max-w-6xl mx-auto">
        <Link href={`/menu/${card.brand.slug}`} className="text-green-500 mb-8 inline-block">
          ← Back to {card.brand.name}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Card Image Section */}
          <div className="bg-gray-900 rounded-3xl aspect-[2.5/3.5] border border-gray-800 flex items-center justify-center overflow-hidden shadow-2xl shadow-green-500/10">
            {card.image ? (
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-700 text-6xl font-black">TCG</span>
            )}
          </div>

{/* Info Section */}
<div className="flex flex-col justify-center">
  <span className="text-green-500 font-mono tracking-widest uppercase mb-2">
    {card.brand.name} // {card.rarity}
  </span>
  <h1 className="text-7xl font-black tracking-tighter mb-4">{card.name}</h1>
  <p className="text-5xl font-mono text-white mb-8">${card.price}</p>
  
  <div className="p-6 border border-gray-800 rounded-2xl bg-gray-950 mb-8">
    <h3 className="text-gray-500 uppercase text-xs font-bold mb-2">Description</h3>
    <p className="text-gray-300">
      {/* REMOVED: The hardcoded "This is a certified..." string.
          ADDED: Logic to show the ACTUAL description from the DB. 
      */}
      {card.description ? card.description : `This is a certified ${card.rarity} collectible from the ${card.brand.name} set. Stored in a smoke-free environment in a top-loader.`}
    </p>
  </div>

  <button className="py-5 bg-green-600 hover:bg-green-500 text-white font-black text-2xl rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-900/20">
    ADD TO COLLECTION
  </button>
</div>
        </div>
      </div>
    </div>
  );
}