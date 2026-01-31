import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";

type SearchCard = {
  _id: any; // mongoose ObjectId in practice; only used for toString()
  name: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await dbConnect();

  const q = (searchParams?.q || "").trim();

  const results =
    q.length === 0
      ? ([] as SearchCard[])
      : ((await Card.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { set: { $regex: q, $options: "i" } },
            { rarity: { $regex: q, $options: "i" } },
          ],
        })
          .limit(50)
          .lean()) as SearchCard[]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight uppercase mb-2">
        Search Results
      </h1>
      <p className="text-gray-500 text-sm mb-10">
        Showing results for:{" "}
        <span className="font-mono text-gray-300">{q || "(empty)"}</span>
      </p>

      {q.length === 0 ? (
        <p className="text-gray-500">Enter a search term.</p>
      ) : results.length === 0 ? (
        <p className="text-gray-500">No cards found matching your search.</p>
      ) : (
        <div className="space-y-4">
          {results.map((card) => (
            <Link key={card._id.toString()} href={`/card/${card._id}`}>
              <div className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 hover:border-green-500 transition-all">
                <h2 className="font-bold">{card.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
