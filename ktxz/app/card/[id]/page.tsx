import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addToCart } from "./cartActions";

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await dbConnect();
  const { id } = await params;

  const card = await Card.findById(id).populate("brand");
  if (!card) notFound();

  const isInactive = card.isActive === false || card.status === "inactive";
  const isSold = card.status === "sold";
  const isBulk = card.inventoryType === "bulk";
  const stock = typeof card.stock === "number" ? card.stock : 1;
  const canBuy = !isInactive && !isSold && (!isBulk || stock > 0);

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24">
      <div className="max-w-6xl mx-auto">
        <Link
          href={`/menu/${(card.brand as any).slug}`}
          className="text-green-500 mb-8 inline-block"
        >
          ← Back to {(card.brand as any).name}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="bg-gray-900 rounded-3xl aspect-[2.5/3.5] border border-gray-800 flex items-center justify-center overflow-hidden shadow-2xl shadow-green-500/10">
            {card.image ? (
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-700 text-6xl font-black">TCG</span>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-green-500 font-mono tracking-widest uppercase mb-2">
              {(card.brand as any).name} // {card.rarity}
            </span>

            <h1 className="text-7xl font-black tracking-tighter mb-4">{card.name}</h1>

            <p className="text-5xl font-mono text-white mb-6">${card.price}</p>

            <div className="flex items-center gap-3 mb-8">
              <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-gray-500">
                {isBulk ? "Bulk" : "Single"}
              </span>
              {isBulk && (
                <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-gray-600">
                  Stock: {stock}
                </span>
              )}
              {(isInactive || isSold) && (
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-red-500">
                  {isSold ? "Sold" : "Inactive"}
                </span>
              )}
            </div>

            <div className="p-6 border border-gray-800 rounded-2xl bg-gray-950 mb-8">
              <h3 className="text-gray-500 uppercase text-xs font-bold mb-2">Description</h3>
              <p className="text-gray-300">
                {card.description
                  ? card.description
                  : `This is a certified ${card.rarity} collectible from the ${(card.brand as any).name} set. Stored in a smoke-free environment in a top-loader.`}
              </p>
            </div>

            {canBuy ? (
              <form action={addToCart}>
                <input type="hidden" name="cardId" value={card._id.toString()} />
                <button className="py-5 bg-green-600 hover:bg-green-500 text-white font-black text-2xl rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-900/20 w-full">
                  Add to Cart
                </button>
              </form>
            ) : (
              <button
                disabled
                className="py-5 bg-gray-900 text-gray-600 font-black text-2xl rounded-2xl w-full cursor-not-allowed border border-gray-800"
              >
                Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
