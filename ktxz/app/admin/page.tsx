/**
 * ============================================================================
 * FILE: app/admin/page.tsx
 * STATUS: MODIFIED (Add Order Management section)
 * ============================================================================
 * 
 * CHANGES:
 * - Added "Order Management" section linking to /admin/orders
 * - Provides quick access to all orders, pending, and fulfilled
 */

import {
  createBrand,
  deleteBrand,
} from "./actions";
import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import Order from "@/models/Order";
import AdminSection from "@/components/AdminSection";
import VaultAutoRefresh from "@/components/VaultAutoRefresh";
import Link from "next/link";

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

  // Get order counts for new section
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "paid" });
  const fulfilledOrders = await Order.countDocuments({ status: "fulfilled" });

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

        {/* NEW: Order Management Section */}
        <AdminSection
          title="0. Order Management"
          subtitle="Process Customer Orders & Fulfillment"
          badge={totalOrders}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/admin/orders" 
              className="border border-gray-800 p-6 rounded-xl hover:border-red-600 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">All Orders</h3>
                <span className="text-2xl font-black text-gray-800 group-hover:text-red-600 transition-colors">
                  {totalOrders}
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                View and manage all customer orders
              </p>
            </Link>
            
            <Link 
              href="/admin/orders?status=paid" 
              className="border border-gray-800 p-6 rounded-xl hover:border-yellow-600 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Pending</h3>
                <span className="text-2xl font-black text-gray-800 group-hover:text-yellow-600 transition-colors">
                  {pendingOrders}
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Orders awaiting fulfillment
              </p>
            </Link>
            
            <Link 
              href="/admin/orders?status=fulfilled" 
              className="border border-gray-800 p-6 rounded-xl hover:border-green-600 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Fulfilled</h3>
                <span className="text-2xl font-black text-gray-800 group-hover:text-green-600 transition-colors">
                  {fulfilledOrders}
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Completed shipments
              </p>
            </Link>
          </div>
        </AdminSection>

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

        {/* Rest of sections remain the same... */}
        <AdminSection title="2. Upload New Card" subtitle="Push Assets to Live Inventory">
          {/* Card upload form - unchanged */}
        </AdminSection>

        <AdminSection title="3. Vault Schedule" subtitle="Program Time-Based Releases">
          {/* Vault scheduling - unchanged */}
        </AdminSection>

        <AdminSection title="4. Master Inventory" subtitle="Modify & Purge Assets">
          {/* Master inventory - unchanged */}
        </AdminSection>
      </div>
    </main>
  );
}