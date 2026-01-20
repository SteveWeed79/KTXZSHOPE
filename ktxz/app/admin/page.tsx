import { createCard, createBrand } from "./actions"; 
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";

export default async function AdminPage() {
  await dbConnect();
  
  // We use .lean() for speed and convert to plain objects
  const brands = await Brand.find({}).lean();

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-black mb-12 tracking-tighter italic border-b border-gray-800 pb-4">
          COMMAND <span className="text-green-500">CENTER</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* --- SECTION 1: BRAND MANAGEMENT --- */}
          <section className="space-y-6">
            <div className="border border-orange-500/20 bg-orange-500/5 p-8 rounded-3xl">
              <h2 className="text-xl font-bold mb-6 text-orange-500 uppercase tracking-widest">
                1. Add New Game Category
              </h2>
              <form action={createBrand} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Game Name</label>
                  <input 
                    name="name" 
                    required 
                    className="bg-black border border-gray-800 p-4 rounded-xl focus:border-orange-500 outline-none transition-all" 
                    placeholder="e.g. One Piece, Lorcana..." 
                  />
                </div>
                <button type="submit" className="bg-orange-600 hover:bg-orange-400 text-black font-black py-4 rounded-xl transition-all uppercase text-sm italic">
                  Initialize Category
                </button>
              </form>
            </div>

            {/* Visual list of what's currently in the DB */}
            <div className="p-4 bg-gray-900/30 rounded-2xl border border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Active Categories</p>
              <div className="flex flex-wrap gap-2">
                {brands.map((b: any) => (
                  <span key={b._id.toString()} className="text-[10px] px-3 py-1 bg-black border border-gray-700 rounded-full font-mono">
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* --- SECTION 2: CARD INVENTORY --- */}
          <section className="border border-green-500/20 bg-green-500/5 p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 text-green-500 uppercase tracking-widest">
              2. Upload New Card
            </h2>
            <form action={createCard} className="flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Card Identity</label>
                <input name="name" required className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="e.g. Blue Eyes White Dragon" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Price ($)</label>
                  <input name="price" type="number" step="0.01" required className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Game Category</label>
                  <select name="brandId" className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none text-sm cursor-pointer">
                    {brands.map((b: any) => (
                      <option key={b._id.toString()} value={b._id.toString()}>
                        {b.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Image Asset URL</label>
                <input name="image" className="bg-black border border-gray-800 p-4 rounded-xl focus:border-green-500 outline-none" placeholder="https://..." />
              </div>

              <button type="submit" className="bg-green-600 hover:bg-green-400 text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest italic shadow-lg shadow-green-900/20">
                Push to Live Inventory
              </button>
            </form>
          </section>

        </div>
      </div>
    </main>
  );
}