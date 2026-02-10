import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";

type SearchCard = {
  _id: any;
  name: string;
  rarity?: string;
  price?: number;
  brand?: { name: string } | null;
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
          .populate("brand")
          .limit(50)
          .lean()) as SearchCard[]);

  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight uppercase mb-2">
        Search Results
      </h1>
      <p className="text-muted-foreground text-sm mb-10">
        Showing results for:{" "}
        <span className="font-mono text-foreground">{q || "(empty)"}</span>
      </p>

      {q.length === 0 ? (
        <p className="text-muted-foreground">Enter a search term.</p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground">No cards found matching your search.</p>
      ) : (
        <div className="space-y-3">
          {results.map((card) => (
            <Link key={card._id.toString()} href={`/card/${card._id}`}>
              <div className="p-4 border border-border rounded-xl bg-card hover:border-primary transition-all flex items-center justify-between">
                <div>
                  <h2 className="font-bold">{card.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.rarity} {card.brand?.name ? `/ ${card.brand.name}` : ""}
                  </p>
                </div>
                {card.price !== undefined && (
                  <span className="font-bold text-sm">${card.price.toFixed(2)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
