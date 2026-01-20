import { createCard } from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";

export default async function AdminPage() {
  await dbConnect();
  const brands = await Brand.find({}); // Fetch your categories (Pokémon, MTG, etc.)

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-xl mx-auto border border-gray-800 p-8 rounded-3xl bg-gray-900/20">
        <h1 className="text-4xl font-black mb-8 tracking-tighter text-green-500">
          ADD NEW CARD
        </h1>

        <form action={createCard} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Card Name</label>
            <input name="name" required className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="e.g. Base Set Charizard" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Price ($)</label>
              <input name="price" type="number" step="0.01" required className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
              <select name="brandId" className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none">
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Image URL</label>
            <input name="image" className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="https://..." />
          </div>

          <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-green-900/20">
            Push to Inventory
          </button>
        </form>
      </div>
    </main>
  );
}
