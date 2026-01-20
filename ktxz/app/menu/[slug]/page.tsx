import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import { notFound } from "next/navigation";
import Link from "next/link"

export default async function MenuPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  await dbConnect();
  const { slug } = await params;

  const brand = await Brand.findOne({ slug: slug });

  if (!brand) {
    notFound();
  }

  const cards = await Card.find({ brand: brand._id });

  return (
    <main className="min-h-screen bg-black text-white p-12">
      <h1 className="text-5xl font-bold border-b border-gray-800 pb-4">
        {brand.name} Collection
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {cards.length === 0 ? (
          <p className="text-gray-500">No cards found in this category yet.</p>
        ) : (
          cards.map((card) => (
            <div key={card._id.toString()} className="group p-4 border border-gray-800 rounded-xl bg-gray-900/50 hover:border-green-500 transition-all duration-300 shadow-xl">
              {/* Card Image */}
              <div className="aspect-[2.5/3.5] bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-700">
                {card.image ? (
                  <img src={card.image} alt={card.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <span className="text-gray-600">No Image</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold group-hover:text-green-400 transition-colors">{card.name}</h2>
              <div className="flex justify-between items-center mt-2">
                <p className="text-2xl font-mono text-green-500">${card.price}</p>
                <span className="text-xs uppercase tracking-widest text-gray-500 px-2 py-1 border border-gray-700 rounded">
                  {card.rarity}
                </span>
              </div>
            <Link href={`/card/${card._id.toString()}`} className="block">
  <button className="w-full mt-4 py-2 bg-white text-black font-bold rounded hover:bg-green-500 hover:text-white transition-all">
    VIEW DETAILS
  </button>
</Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}