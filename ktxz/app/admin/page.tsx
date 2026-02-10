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
import { Package, Clock, CheckCircle, Settings } from "lucide-react";

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

  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "paid" });
  const fulfilledOrders = await Order.countDocuments({ status: "fulfilled" });

  const vaultEvents = cards
    .flatMap((c) => [c.vaultReleaseDate, c.vaultExpiryDate])
    .filter((d): d is Date => !!d);

  return (
    <main className="min-h-screen py-8">
      <VaultAutoRefresh events={vaultEvents} />

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Inventory, orders & site management
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
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
                <h3 className="font-bold text-sm uppercase tracking-wider">All Orders</h3>
                <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-3xl font-bold">{totalOrders}</span>
              <p className="text-xs text-muted-foreground mt-1">
                View and manage all orders
              </p>
            </Link>

            <Link
              href="/admin/orders?status=paid"
              className="border border-border p-6 rounded-xl hover:border-yellow-500 transition-all group bg-background"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Pending</h3>
                <Clock className="h-5 w-5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
              </div>
              <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{pendingOrders}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting fulfillment
              </p>
            </Link>

            <Link
              href="/admin/orders?status=fulfilled"
              className="border border-border p-6 rounded-xl hover:border-green-500 transition-all group bg-background"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Fulfilled</h3>
                <CheckCircle className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
              </div>
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">{fulfilledOrders}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Completed shipments
              </p>
            </Link>
          </div>
        </AdminSection>

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
                  {b.name} <span className="text-muted-foreground">[{b.count}]</span>
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

        <AdminSection title="Upload New Card" subtitle="Add cards to live inventory">
          {/* Card upload form - unchanged */}
        </AdminSection>

        <AdminSection title="Vault Schedule" subtitle="Program time-based releases">
          {/* Vault scheduling - unchanged */}
        </AdminSection>

        <AdminSection title="Master Inventory" subtitle="Manage & modify all cards">
          {/* Master inventory - unchanged */}
        </AdminSection>
      </div>
    </main>
  );
}
