import { createCard, createBrand, updateVaultStatus, deleteCard, deleteBrand, updateCard } from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import AdminSection from "@/components/AdminSection"; // Import our new wrapper

const formatDateForInput = (date?: Date | null) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  } catch (e) { return ""; }
};

export default async function AdminPage() {
  await dbConnect();
  const rawBrands = await Brand.find({}).sort({ name: 1 });
  const cards = await Card.find({}).populate('brand').sort({ createdAt: -1 });
  
  const brandsWithCounts = await Promise.all(rawBrands.map(async (brand) => {
    const count = await Card.countDocuments({ brand: brand._id });
    return { _id: brand._id.toString(), name: brand.name, count };
  }));

  const now = new Date();

  return (
    <main className="min-h-screen bg-black p-8 font-sans text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-12">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Command Center</h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">Inventory & Vault Logistics</p>
        </header>

        {/* SECTION 1: CATEGORIES */}
        <AdminSection title="1. Game Categories" subtitle="Initialize & Manage Brands" badge={brandsWithCounts.length}>
          <form action={createBrand} className="flex gap-4 mb-8">
            <input name="name" required placeholder="NEW CATEGORY NAME" className="flex-1 bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-red-600 transition-all placeholder:text-gray-700" />
            <button className="bg-white text-black px-8 font-black rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs">Initialize</button>
          </form>
          <div className="flex flex-wrap gap-3">
            {brandsWithCounts.map((b) => (
              <div key={b._id} className="flex items-center gap-3 bg-black border border-gray-800 px-4 py-2 rounded-xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{b.name} <span className="text-gray-600">[{b.count}]</span></span>
                <form action={deleteBrand}><input type="hidden" name="brandId" value={b._id} /><button type="submit" className="text-gray-700 hover:text-red-500 font-black text-xs transition-colors">✕</button></form>
              </div>
            ))}
          </div>
        </AdminSection>

        {/* SECTION 2: UPLOAD */}
        <AdminSection title="2. Upload New Card" subtitle="Push Assets to Live Inventory">
          <form action={createCard} className="space-y-4">
            <input name="name" required placeholder="CARD IDENTITY" className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" />
            <div className="grid grid-cols-2 gap-4">
              <input name="price" type="number" step="0.01" required placeholder="PRICE ($)" className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" />
              <input name="rarity" placeholder="RARITY" className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" />
            </div>
            <textarea name="description" placeholder="ASSET DESCRIPTION" className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 min-h-[100px] resize-none" />
            <select name="brandId" required className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 uppercase text-xs font-bold">
              <option value="">Select Category</option>
              {rawBrands.map((b) => <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>)}
            </select>
            <input name="image" placeholder="IMAGE ASSET URL" className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500" />
            <button className="w-full bg-green-600 text-white font-black py-5 rounded-2xl hover:bg-green-400 transition-all uppercase italic tracking-widest text-sm shadow-lg shadow-green-900/20">Push to Live Inventory</button>
          </form>
        </AdminSection>

        {/* SECTION 3: VAULT CONTROL */}
        <AdminSection title="3. Vault Command & Control" subtitle="Scheduling & Timing">
          <div className="space-y-4">
            {cards.map((card) => {
              const isLive = card.isVault && card.vaultReleaseDate && new Date(card.vaultReleaseDate) <= now && (!card.vaultExpiryDate || new Date(card.vaultExpiryDate) > now);
              return (
                <div key={card._id.toString()} className={`p-6 bg-black border rounded-2xl ${isLive ? 'border-red-600 shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)]' : 'border-gray-800'}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-5">
                      <img src={card.image || "https://via.placeholder.com/150"} alt="" className="w-16 h-24 object-cover rounded-lg border border-gray-800" />
                      <div>
                        <h3 className="font-bold text-white uppercase text-lg">{card.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{card.rarity} // {card.brand?.name}</p>
                      </div>
                    </div>
                  </div>
                  <form action={updateVaultStatus} className="bg-gray-900/20 p-4 rounded-xl border border-gray-800/50">
                    <input type="hidden" name="cardId" value={card._id.toString()} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="datetime-local" name="vaultReleaseDate" defaultValue={formatDateForInput(card.vaultReleaseDate)} className="bg-black border border-gray-800 p-2 rounded-lg text-[10px] text-white uppercase font-mono" />
                        <input type="datetime-local" name="vaultExpiryDate" defaultValue={formatDateForInput(card.vaultExpiryDate)} className="bg-black border border-gray-800 p-2 rounded-lg text-[10px] text-white uppercase font-mono" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="submit" name="actionType" value="update" className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg">Update Schedule</button>
                      </div>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        </AdminSection>

{/* SECTION 4: MASTER INVENTORY */}
<AdminSection title="4. Master Inventory" subtitle="Full Database CRUD" badge={cards.length}>
  <div className="space-y-6">
    {cards.map((card) => (
      <div key={card._id.toString()} className="bg-black border border-gray-900 p-6 rounded-2xl group hover:border-blue-900/50 transition-all">
        <form action={updateCard} className="space-y-4">
          <input type="hidden" name="cardId" value={card._id.toString()} />
          
          {/* Top Row: Main Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-1 flex justify-center">
              <img 
                src={card.image || "https://via.placeholder.com/150"} 
                alt="" 
                className="w-12 h-16 object-cover rounded border border-gray-800" 
              />
            </div>
            
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[8px] text-gray-600 uppercase font-mono ml-1">Asset Name</label>
              <input name="name" defaultValue={card.name} className="w-full bg-gray-950 border border-gray-800 p-2 rounded-lg text-xs text-white outline-none focus:border-blue-600" />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[8px] text-gray-600 uppercase font-mono ml-1">Price ($)</label>
              <input name="price" type="number" step="0.01" defaultValue={card.price} className="w-full bg-gray-950 border border-gray-800 p-2 rounded-lg text-xs text-white outline-none focus:border-blue-600" />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[8px] text-gray-600 uppercase font-mono ml-1">Rarity</label>
              <input name="rarity" defaultValue={card.rarity} className="w-full bg-gray-950 border border-gray-800 p-2 rounded-lg text-xs text-white outline-none focus:border-blue-600" />
            </div>

            <div className="lg:col-span-3 space-y-1">
              <label className="text-[8px] text-gray-600 uppercase font-mono ml-1">Image URL</label>
              <input name="image" defaultValue={card.image} className="w-full bg-gray-950 border border-gray-800 p-2 rounded-lg text-[10px] text-gray-400 outline-none focus:border-blue-600" />
            </div>
          </div>

          {/* Middle Row: Description Edit */}
          <div className="space-y-1">
            <label className="text-[8px] text-gray-600 uppercase font-mono ml-1">Asset Description // Specs</label>
            <textarea 
              name="description" 
              defaultValue={card.description} 
              className="w-full bg-gray-950 border border-gray-800 p-3 rounded-lg text-xs text-gray-300 outline-none focus:border-blue-600 min-h-[80px] resize-y"
            />
          </div>

          {/* Bottom Row: Actions */}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600/10 border border-blue-900/50 text-blue-500 hover:bg-blue-600 hover:text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all">
              Save All Changes
            </button>
            <button 
              formAction={deleteCard} 
              className="px-6 bg-transparent border border-gray-900 text-gray-700 hover:border-red-600 hover:text-red-600 text-[10px] font-black uppercase rounded-xl transition-all"
            >
              Delete Permanent
            </button>
          </div>
        </form>
      </div>
    ))}
  </div>
</AdminSection>

      </div>
    </main>
  );
}