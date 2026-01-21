import { createCard, createBrand, updateVaultStatus } from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";

// Helper to format MongoDB dates for HTML datetime-local inputs
const formatDateForInput = (date?: Date) => {
  if (!date) return "";
  const d = new Date(date);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

export default async function AdminPage() {
  await dbConnect();
  
  // Fetch data for the UI
  const brands = await Brand.find({}).sort({ name: 1 });
  const cards = await Card.find({}).populate('brand').sort({ createdAt: -1 });

  return (
    <main className="min-h-screen bg-black p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        <header>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Command Center
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
            Inventory & Vault Logistics
          </p>
        </header>

        {/* 1. CATEGORY INITIALIZATION */}
        <section className="p-8 border border-gray-900 rounded-3xl bg-gray-950/50">
          <h2 className="text-xl font-black italic uppercase text-white mb-6">1. Add New Game Category</h2>
          <form action={createBrand} className="flex gap-4">
            <input 
              name="name" 
              required 
              placeholder="GAME NAME (e.g. MAGIC: THE GATHERING)" 
              className="flex-1 bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-red-600 transition-all placeholder:text-gray-700" 
            />
            <button className="bg-white text-black px-8 font-black rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs">
              Initialize
            </button>
          </form>
        </section>

        {/* 2. CARD UPLOAD (Standard Inventory) */}
        <section className="p-8 border border-gray-900 rounded-3xl bg-gray-950/50 shadow-2xl shadow-green-900/10">
          <h2 className="text-xl font-black italic uppercase text-green-500 mb-6 font-mono">2. Upload New Card</h2>
          <form action={createCard} className="space-y-4">
            <input 
              name="name" 
              required 
              placeholder="CARD IDENTITY" 
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <input 
                name="price" 
                type="number" 
                step="0.01" 
                required 
                placeholder="PRICE ($)" 
                className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" 
              />
              <input 
                name="rarity" 
                placeholder="RARITY (e.g. GHOST RARE)" 
                className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" 
              />
            </div>

            <div className="relative">
              <select 
                name="brandId" 
                required 
                className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 appearance-none uppercase text-xs font-bold tracking-widest text-gray-400"
              >
                <option value="">Select Game Category</option>
                {brands.map((b) => (
                  <option key={b._id.toString()} value={b._id.toString()}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">▼</div>
            </div>

            <input 
              name="image" 
              placeholder="IMAGE ASSET URL" 
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 transition-all placeholder:text-gray-700" 
            />
            
            <button className="w-full bg-green-600 text-white font-black py-5 rounded-2xl hover:bg-green-400 transition-all uppercase italic tracking-widest text-sm shadow-lg shadow-green-900/20">
              Push to Live Inventory
            </button>
          </form>
        </section>

        {/* 3. VAULT COMMAND & CONTROL (Scheduling) */}
        <section className="p-8 border border-red-900/30 rounded-3xl bg-gray-950/50">
          <h2 className="text-xl font-black italic uppercase text-red-600 mb-6">3. Vault Command & Control</h2>
          <div className="space-y-4">
            {cards.map((card) => (
              <div 
                key={card._id.toString()} 
                className={`p-6 bg-black border rounded-2xl transition-all duration-300 ${
                  card.isVault ? 'border-red-900/50 shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)]' : 'border-gray-800'
                }`}
              >
                {/* Card Header Info */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex gap-5">
                    <img 
                      src={card.image || "https://via.placeholder.com/150"} 
                      alt="" 
                      className="w-16 h-24 object-cover rounded-lg border border-gray-800" 
                    />
                    <div>
                      <h3 className="font-bold text-white uppercase text-lg tracking-tight">{card.name}</h3>
                      <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-1">
                        {card.rarity} // {card.brand?.name || "Uncategorized"}
                      </p>
                      <div className="mt-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                          card.isVault ? 'text-red-500 border-red-900 bg-red-950/20' : 'text-gray-600 border-gray-800'
                        }`}>
                          {card.isVault ? '● Vault Active' : '○ Marketplace Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scheduling Form */}
                <form action={updateVaultStatus} className="bg-gray-900/20 p-4 rounded-xl border border-gray-800/50">
                  <input type="hidden" name="cardId" value={card._id.toString()} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    
                    {/* Date Pickers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono pl-1">Release (Start)</label>
                        <input 
                          type="datetime-local" 
                          name="vaultReleaseDate"
                          defaultValue={formatDateForInput(card.vaultReleaseDate)}
                          className="w-full bg-black border border-gray-800 p-2 rounded-lg text-[10px] text-white focus:border-red-600 outline-none uppercase font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono pl-1">Expiry (End)</label>
                        <input 
                          type="datetime-local" 
                          name="vaultExpiryDate"
                          defaultValue={formatDateForInput(card.vaultExpiryDate)}
                          className="w-full bg-black border border-gray-800 p-2 rounded-lg text-[10px] text-white focus:border-red-600 outline-none uppercase font-mono"
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 justify-end">
                      {card.isVault && (
                        <button 
                          type="submit" 
                          name="actionType" 
                          value="deactivate"
                          className="px-4 py-3 bg-gray-900 border border-gray-800 text-gray-400 hover:bg-red-950 hover:border-red-900 hover:text-red-500 text-[10px] font-bold uppercase rounded-lg transition-all"
                        >
                          Deactivate
                        </button>
                      )}
                      
                      <button 
                        type="submit" 
                        name="actionType" 
                        value="update"
                        className={`px-6 py-3 text-[10px] font-black uppercase rounded-lg transition-all tracking-widest ${
                          card.isVault 
                            ? 'bg-white text-black hover:bg-gray-200' 
                            : 'bg-red-600 text-white hover:bg-red-500'
                        }`}
                      >
                        {card.isVault ? 'Update Schedule' : 'Activate Vault'}
                      </button>
                    </div>

                  </div>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}