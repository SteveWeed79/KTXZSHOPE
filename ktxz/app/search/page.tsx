import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";

export default async function SearchPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q: string }> 
}) {
  await dbConnect();
  const { q } = await searchParams;

  // Search MongoDB for card names containing the query (case-insensitive)
  const results = await Card.find({
    name: { $regex: q, $options: "i" }
  }).populate('brand');

  return (
    <main className="min-h-screen bg-black text-white p-12">
      <h1 className="text-4xl font-bold mb-8">
        Results for: <span className="text-green-500">"{q}"</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {results.length === 0 ? (
          <p className="text-gray-500">No cards found matching your search.</p>
        ) : (
          results.map((card) => (
            <Link key={card._id.toString()} href={`/card/${card._id}`}>
               <div className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 hover:border-green-500 transition-all">
                 <h2 className="font-bold">{card.name}</h2>
                 <p className="text-green-500">${card.price}</p>
                 <p className="text-xs text-gray-500">{card.brand.name}</p>
               </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}