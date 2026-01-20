import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import { revalidatePath } from "next/cache";

export default async function Home() {
  await dbConnect();
  const brands = await Brand.find({});

  async function seedBrands() {
    "use server";
    await dbConnect();
    const defaultBrands = [
      { name: "Pokémon", slug: "pokemon" },
      { name: "Magic: The Gathering", slug: "mtg" },
      { name: "Yu-Gi-Oh!", slug: "yugioh" }
    ];
    for (const b of defaultBrands) {
      await Brand.updateOne({ slug: b.slug }, b, { upsert: true });
    }
    revalidatePath("/");
  }

  async function clearCards() {
    "use server";
    await dbConnect();
    await Card.deleteMany({}); // This wipes the cards collection clean
    revalidatePath("/");
  }

  async function seedCard() {
    "use server";
    await dbConnect();
    const pokemonBrand = await Brand.findOne({ slug: "pokemon" });
    if (pokemonBrand) {
      await Card.create({
        name: "Base Set Charizard",
        price: 499.99,
        image: "https://example.com/charizard.jpg",
        rarity: "Holo Rare",
        brand: pokemonBrand._id
      });
    }
    revalidatePath("/");
  }

  // --- NO EXTRA BRACKET HERE ---

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-24">
      <h1 className="text-6xl font-extrabold tracking-tighter mb-4">KTXZ SHOP</h1>
      
      <div className="p-6 border border-green-500 bg-green-950/10 rounded-xl text-center">
        <p className="text-green-400 font-mono text-xl mb-4">
          STATUS: {brands.length > 0 ? "LIVE DATA DETECTED" : "DATABASE EMPTY"}
        </p>
        <p className="text-3xl font-bold">{brands.length} BRANDS FOUND</p>
        
        {brands.length === 0 ? (
          <form action={seedBrands}>
            <button className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">
              INITIALIZE BRANDS
            </button>
          </form>
        ) : (
          <form action={seedCard}>
            <button className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg">
              ADD CHARIZARD TO POKÉMON
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {brands.map((brand) => (
          <div key={brand.slug} className="px-4 py-2 border border-gray-700 rounded-md bg-gray-900">
            {brand.name}
          </div>
        ))}
      </div>
      <form action={clearCards}>
  <button className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-600 text-red-200 text-xs font-bold rounded border border-red-800 transition-all">
    DANGER: WIPE ALL CARDS
  </button>
</form>
    </main>
  );
}