import {
  createCard,
  createBrand,
  updateVaultStatus,
  deleteCard,
  deleteBrand,
  updateCard,
  removeFromVault,
} from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import AdminSection from "@/components/AdminSection";
import VaultAutoRefresh from "@/components/VaultAutoRefresh";

type IdLike = { toString(): string };

type AdminCardBrand = { name?: string | null } | null | undefined;

type AdminCard = {
  _id: IdLike;
  name: string;
  price: number;
  rarity?: string | null;
  description?: string | null;
  image?: string | null;
  inventoryType?: "single" | "bulk" | null;
  stock?: number | null;
  isActive?: boolean | null;
  isVault?: boolean | null;
  vaultReleaseDate?: Date | null;
  vaultExpiryDate?: Date | null;
  status?: string | null;
  brand?: AdminCardBrand;
};

const formatDateForInput = (date?: Date | null) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  } catch {
    return "";
  }
};

export default async function AdminPage() {
  await dbConnect();

  const rawBrands = await Brand.find({}).sort({ name: 1 });
  const cards = (await Card.find({}).populate("brand").sort({ createdAt: -1 }).lean()) as AdminCard[];

  const brandsWithCounts = await Promise.all(
    rawBrands.map(async (brand) => {
      const count = await Card.countDocuments({ brand: brand._id });
      return { _id: brand._id.toString(), name: brand.name, count };
    })
  );

  const now = new Date();

  const vaultEvents = cards
    .flatMap((c) => [c.vaultReleaseDate, c.vaultExpiryDate])
    .filter((d): d is Date => !!d);

  return (
    <main className="min-h-screen bg-black p-8 font-sans text-white">
      <VaultAutoRefresh events={vaultEvents} />

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-12">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Command Center
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
            Inventory & Vault Logistics
          </p>
        </header>

        <AdminSection
          title="1. Game Categories"
          subtitle="Initialize & Manage Brands"
          badge={brandsWithCounts.length}
        >
          <form action={createBrand} className="flex gap-4 mb-8">
            <input
              name="name"
              required
              placeholder="NEW CATEGORY NAME"
              className="flex-1 bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-red-600 transition-all placeholder:text-gray-700"
            />
            <button className="bg-white text-black px-8 font-black rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs">
              Initialize
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            {brandsWithCounts.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 bg-black border border-gray-800 px-4 py-2 rounded-xl"
              >
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {b.name} <span className="text-gray-600">[{b.count}]</span>
                </span>
                <form action={deleteBrand}>
                  <input type="hidden" name="brandId" value={b._id} />
                  <button
                    type="submit"
                    className="text-gray-700 hover:text-red-500 font-black text-xs"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="2. Upload New Card" subtitle="Push Assets to Live Inventory">
          <form action={createCard} className="space-y-4">
            <input
              name="name"
              required
              placeholder="CARD IDENTITY"
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 placeholder:text-gray-700"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                name="price"
                type="number"
                step="0.01"
                required
                placeholder="PRICE ($)"
                className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 placeholder:text-gray-700"
              />
              <input
                name="rarity"
                placeholder="RARITY"
                className="bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 placeholder:text-gray-700"
              />
            </div>

            <textarea
              name="description"
              placeholder="ASSET DESCRIPTION"
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 min-h-[100px] resize-none"
            />

            <select
              name="brandId"
              required
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500 uppercase text-xs font-bold"
            >
              <option value="">Select Category</option>
              {rawBrands.map((b) => (
                <option key={b._id.toString()} value={b._id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>

            <input
              name="image"
              placeholder="IMAGE ASSET URL"
              className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
            />

            {/* Inventory Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-800 rounded-xl bg-gray-900/10">
              <div className="space-y-1">
                <label className="text-[8px] text-gray-600 uppercase font-mono">Inventory</label>
                <select
                  name="inventoryType"
                  defaultValue="single"
                  className="w-full bg-black border border-gray-800 p-3 rounded-lg text-[10px] text-white font-mono uppercase"
                >
                  <option value="single">Single</option>
                  <option value="bulk">Bulk</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-gray-600 uppercase font-mono">Stock</label>
                <input
                  name="stock"
                  type="number"
                  min={0}
                  placeholder="(Bulk only)"
                  className="w-full bg-black border border-gray-800 p-3 rounded-lg text-[10px] text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-gray-600 uppercase font-mono">Visibility</label>
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-white mt-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="w-4 h-4 border-gray-800 bg-black rounded"
                  />
                  Active Listing
                </label>
              </div>
            </div>

            <div className="flex gap-6 p-4 border border-gray-800 rounded-xl bg-gray-900/10">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-white">
                <input type="checkbox" name="isFeatured" className="w-4 h-4 border-gray-800 bg-black rounded" />{" "}
                Featured Asset
              </label>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-white">
                <input type="checkbox" name="isVault" className="w-4 h-4 border-gray-800 bg-black rounded" />{" "}
                Auto-Vault
              </label>
            </div>

            <button className="w-full bg-green-600 text-white font-black py-5 rounded-2xl hover:bg-green-400 uppercase italic tracking-widest text-sm shadow-lg shadow-green-900/20">
              Push to Live Inventory
            </button>
          </form>
        </AdminSection>

        <AdminSection title="3. Vault Schedule" subtitle="Program Time-Based Releases">
          <div className="space-y-4">
            {cards
              .filter((card) => card.isVault)
              .map((card) => (
                <div
                  key={card._id.toString()}
                  className="p-6 bg-black border border-gray-800 rounded-2xl space-y-4"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="text-sm font-black uppercase tracking-widest">
                        {card.name}
                      </div>
                      <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.25em]">
                        {card.rarity} // {card.brand?.name}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-black">${card.price}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600">
                        {card.status ?? "active"}
                      </div>
                    </div>
                  </div>

                  <form action={updateVaultStatus} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="hidden" name="cardId" value={card._id.toString()} />

                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-600 uppercase font-mono">
                        Release Date
                      </label>
                      <input
                        type="datetime-local"
                        name="vaultReleaseDate"
                        defaultValue={formatDateForInput(card.vaultReleaseDate)}
                        className="w-full bg-black border border-gray-800 p-3 rounded-xl text-[10px] text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-600 uppercase font-mono">
                        Expiry Date
                      </label>
                      <input
                        type="datetime-local"
                        name="vaultExpiryDate"
                        defaultValue={formatDateForInput(card.vaultExpiryDate)}
                        className="w-full bg-black border border-gray-800 p-3 rounded-xl text-[10px] text-white font-mono"
                      />
                    </div>

                    <div className="flex items-end gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:bg-green-500 hover:text-white transition-all uppercase text-[10px]"
                      >
                        Update Schedule
                      </button>

                      <form action={removeFromVault}>
                        <input type="hidden" name="cardId" value={card._id.toString()} />
                        <button
                          type="submit"
                          className="bg-black border border-gray-800 px-4 py-3 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-500 transition-all font-black uppercase text-[10px]"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </form>

                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-700">
                    Current Time: {now.toLocaleString()}
                  </div>
                </div>
              ))}

            {cards.filter((card) => card.isVault).length === 0 && (
              <div className="text-gray-600 text-xs font-mono uppercase tracking-[0.25em]">
                No vault assets currently scheduled.
              </div>
            )}
          </div>
        </AdminSection>

        <AdminSection title="4. Master Inventory" subtitle="Modify & Purge Assets">
          <div className="space-y-4">
            {cards.map((card) => (
              <div
                key={card._id.toString()}
                className="border border-gray-800 rounded-2xl p-6 bg-black space-y-4"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-black uppercase tracking-widest">
                      {card.name}
                    </div>
                    <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.25em]">
                      {card.rarity} // ${card.price}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600">
                      {card.isActive ? "active" : "inactive"}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600">
                      {card.inventoryType ?? "single"}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600">
                      stock: {card.stock ?? 0}
                    </div>
                  </div>
                </div>

                <form action={updateCard} className="space-y-4">
                  <input type="hidden" name="cardId" value={card._id.toString()} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      name="name"
                      defaultValue={card.name}
                      className="bg-black border border-gray-800 p-3 rounded-xl text-white text-xs font-mono"
                    />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={card.price}
                      className="bg-black border border-gray-800 p-3 rounded-xl text-white text-xs font-mono"
                    />
                    <input
                      name="rarity"
                      defaultValue={card.rarity ?? ""}
                      className="bg-black border border-gray-800 p-3 rounded-xl text-white text-xs font-mono"
                    />
                  </div>

                  <textarea
                    name="description"
                    defaultValue={card.description ?? ""}
                    className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white text-xs font-mono min-h-[80px]"
                  />

                  <input
                    name="image"
                    defaultValue={card.image ?? ""}
                    className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white text-xs font-mono"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-800 rounded-xl bg-gray-900/10">
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-600 uppercase font-mono">Inventory</label>
                      <select
                        name="inventoryType"
                        defaultValue={card.inventoryType ?? "single"}
                        className="w-full bg-black border border-gray-800 p-3 rounded-lg text-[10px] text-white font-mono uppercase"
                      >
                        <option value="single">Single</option>
                        <option value="bulk">Bulk</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-600 uppercase font-mono">Stock</label>
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={card.stock ?? 0}
                        className="w-full bg-black border border-gray-800 p-3 rounded-lg text-[10px] text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-600 uppercase font-mono">Visibility</label>
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-white mt-2">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={!!card.isActive}
                          className="w-4 h-4 border-gray-800 bg-black rounded"
                        />
                        Active Listing
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      className="bg-white text-black px-8 py-3 font-black uppercase rounded-xl hover:bg-green-500 hover:text-white transition-all text-xs"
                    >
                      Save All Changes
                    </button>

                    <form action={deleteCard}>
                      <input type="hidden" name="cardId" value={card._id.toString()} />
                      <button
                        type="submit"
                        className="bg-black border border-gray-800 px-6 py-3 text-gray-400 hover:text-red-500 hover:border-red-500 font-black uppercase rounded-xl transition-all"
                      >
                        Delete Permanent
                      </button>
                    </form>
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
