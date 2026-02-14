import {
  createCard,
  createBrand,
  deleteBrand,
  updateCard,
  deleteCard,
  updateVaultStatus,
  removeFromVault,
} from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import Order from "@/models/Order";
import AdminSection from "@/components/AdminSection";
import VaultAutoRefresh from "@/components/VaultAutoRefresh";
import Link from "next/link";
import { Package, Clock, CheckCircle } from "lucide-react";

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
  const cards = (await Card.find({})
    .populate("brand")
    .sort({ createdAt: -1 })
    .lean()) as AdminCard[];

  const brandsWithCounts = await Promise.all(
    rawBrands.map(async (brand) => {
      const count = await Card.countDocuments({ brand: brand._id });
      return { _id: brand._id.toString(), name: brand.name, count };
    })
  );

  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "paid" });
  const fulfilledOrders = await Order.countDocuments({ status: "fulfilled" });

  const now = new Date();

  const vaultEvents = cards
    .flatMap((c) => [c.vaultReleaseDate, c.vaultExpiryDate])
    .filter((d): d is Date => !!d);

  return (
    <main className="min-h-screen section-spacing">
      <VaultAutoRefresh events={vaultEvents} />

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl brand-heading">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inventory, orders & site management
          </p>
        </header>

        {/* Order Management Section */}
        <AdminSection
          title="Order Management"
          subtitle="Process customer orders & fulfillment"
          badge={totalOrders}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/orders"
              className="border border-border p-6 rounded-xl hover:border-primary transition-all group bg-background"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  All Orders
                </h3>
                <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-3xl font-bold">{totalOrders}</span>
              <p className="text-xs text-muted-foreground mt-1">
                View and manage all orders
              </p>
            </Link>

            <Link
              href="/admin/orders?status=paid"
              className="border border-border p-6 rounded-xl hover:border-primary transition-all group bg-background"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Pending
                </h3>
                <Clock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-3xl font-bold text-primary">
                {pendingOrders}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting fulfillment
              </p>
            </Link>

            <Link
              href="/admin/orders?status=fulfilled"
              className="border border-border p-6 rounded-xl hover:border-primary transition-all group bg-background"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Fulfilled
                </h3>
                <CheckCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-3xl font-bold text-primary">
                {fulfilledOrders}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Completed shipments
              </p>
            </Link>
          </div>
        </AdminSection>

        {/* Game Categories */}
        <AdminSection
          title="Game Categories"
          subtitle="Manage trading card game brands"
          badge={brandsWithCounts.length}
        >
          <form action={createBrand} className="flex gap-4 mb-8">
            <input
              name="name"
              required
              placeholder="New category name"
              className="flex-1 bg-background border border-border p-3 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
            <button className="bg-primary text-primary-foreground px-6 font-bold rounded-xl hover:brightness-90 transition-all uppercase text-xs tracking-wide">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            {brandsWithCounts.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 bg-background border border-border px-4 py-2 rounded-xl"
              >
                <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                  {b.name}{" "}
                  <span className="text-muted-foreground">[{b.count}]</span>
                </span>
                <form action={deleteBrand}>
                  <input type="hidden" name="brandId" value={b._id} />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-primary font-bold text-xs transition-colors"
                  >
                    x
                  </button>
                </form>
              </div>
            ))}
          </div>
        </AdminSection>

        {/* Upload New Card */}
        <AdminSection
          title="Upload New Card"
          subtitle="Add cards to live inventory"
        >
          <form action={createCard} className="space-y-4">
            <input
              name="name"
              required
              placeholder="Card name"
              className="w-full bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                name="price"
                type="number"
                step="0.01"
                required
                placeholder="Price ($)"
                className="bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
              />
              <input
                name="rarity"
                placeholder="Rarity"
                className="bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
              />
            </div>
            <textarea
              name="description"
              placeholder="Card description"
              className="w-full bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-none placeholder:text-muted-foreground"
            />
            <select
              name="brandId"
              required
              className="w-full bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary uppercase text-xs font-bold"
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
              placeholder="Image URL"
              className="w-full bg-background border border-border p-4 rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
            <button className="w-full btn-primary py-4 text-sm">
              Push to Live Inventory
            </button>
          </form>
        </AdminSection>

        {/* Featured Schedule */}
        <AdminSection
          title="Featured Schedule"
          subtitle="Program time-based releases"
        >
          <div className="space-y-4">
            {cards.map((card) => {
              const isLive =
                card.isVault &&
                card.vaultReleaseDate &&
                new Date(card.vaultReleaseDate) <= now &&
                (!card.vaultExpiryDate ||
                  new Date(card.vaultExpiryDate) > now);
              return (
                <div
                  key={card._id.toString()}
                  className={`p-6 border rounded-2xl ${
                    isLive
                      ? "border-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]"
                      : "border-border"
                  } bg-background`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-5">
                      <img
                        src={card.image || "https://via.placeholder.com/150"}
                        alt=""
                        className="w-16 h-24 object-cover rounded-lg border border-border"
                      />
                      <div>
                        <h3 className="font-bold text-foreground uppercase text-lg">
                          {card.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                          {card.rarity} // {card.brand?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <form
                    action={updateVaultStatus}
                    className="bg-muted/30 p-4 rounded-xl border border-border/50"
                  >
                    <input
                      type="hidden"
                      name="cardId"
                      value={card._id.toString()}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground uppercase font-mono mb-1 block">
                            Release
                          </label>
                          <input
                            type="datetime-local"
                            name="vaultReleaseDate"
                            defaultValue={formatDateForInput(
                              card.vaultReleaseDate
                            )}
                            className="w-full bg-background border border-border p-2 rounded-lg text-[10px] text-foreground uppercase font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground uppercase font-mono mb-1 block">
                            Expiry
                          </label>
                          <input
                            type="datetime-local"
                            name="vaultExpiryDate"
                            defaultValue={formatDateForInput(
                              card.vaultExpiryDate
                            )}
                            className="w-full bg-background border border-border p-2 rounded-lg text-[10px] text-foreground uppercase font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="submit"
                          className="px-6 py-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-lg hover:brightness-90 transition-all"
                        >
                          Update Schedule
                        </button>
                      </div>
                    </div>
                  </form>
                  {card.isVault && (
                    <form action={removeFromVault} className="mt-3 flex justify-end">
                      <input type="hidden" name="cardId" value={card._id.toString()} />
                      <button
                        type="submit"
                        className="px-4 py-2 text-[10px] font-bold uppercase rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                      >
                        Remove from Featured
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </AdminSection>

        {/* Master Inventory */}
        <AdminSection
          title="Master Inventory"
          subtitle="Manage & modify all cards"
          badge={cards.length}
        >
          <div className="space-y-6">
            {cards.map((card) => (
              <div
                key={card._id.toString()}
                className="bg-background border border-border p-6 rounded-2xl group hover:border-primary/50 transition-all"
              >
                <form action={updateCard} className="space-y-4">
                  <input
                    type="hidden"
                    name="cardId"
                    value={card._id.toString()}
                  />

                  {/* Top Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-1 flex justify-center">
                      <img
                        src={card.image || "https://via.placeholder.com/150"}
                        alt=""
                        className="w-12 h-16 object-cover rounded border border-border"
                      />
                    </div>

                    <div className="lg:col-span-4 space-y-1">
                      <label className="text-[8px] text-muted-foreground uppercase font-mono ml-1">
                        Name
                      </label>
                      <input
                        name="name"
                        defaultValue={card.name}
                        className="w-full bg-muted/30 border border-border p-2 rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="lg:col-span-2 space-y-1">
                      <label className="text-[8px] text-muted-foreground uppercase font-mono ml-1">
                        Price ($)
                      </label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={card.price}
                        className="w-full bg-muted/30 border border-border p-2 rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="lg:col-span-2 space-y-1">
                      <label className="text-[8px] text-muted-foreground uppercase font-mono ml-1">
                        Rarity
                      </label>
                      <input
                        name="rarity"
                        defaultValue={card.rarity || ""}
                        className="w-full bg-muted/30 border border-border p-2 rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="lg:col-span-3 space-y-1">
                      <label className="text-[8px] text-muted-foreground uppercase font-mono ml-1">
                        Image URL
                      </label>
                      <input
                        name="image"
                        defaultValue={card.image || ""}
                        className="w-full bg-muted/30 border border-border p-2 rounded-lg text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[8px] text-muted-foreground uppercase font-mono ml-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={card.description || ""}
                      className="w-full bg-muted/30 border border-border p-3 rounded-lg text-xs text-foreground outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase py-3 rounded-xl transition-all"
                    >
                      Save All Changes
                    </button>
                    <button
                      formAction={deleteCard}
                      className="px-6 bg-transparent border border-border text-muted-foreground hover:border-primary hover:text-primary text-[10px] font-bold uppercase rounded-xl transition-all"
                    >
                      Delete
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
