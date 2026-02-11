import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatDate(date: Date | string | undefined | null) {
  if (!date) return "--";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return <div className="text-muted-foreground p-12">User not found.</div>;

  const userId = String(user._id);
  const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(3).lean();
  const totalOrders = await Order.countDocuments({ user: userId });

  return (
    <main className="py-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-border pb-12">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground border-4 border-background">
            {user.name?.charAt(0) || "U"}
          </div>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold uppercase tracking-tighter">
            {user.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Member since {new Date(user.createdAt).getFullYear()}
          </p>
          <div className="mt-3 flex gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-lg capitalize">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Account Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Email</label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Status</label>
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Active
              </p>
            </div>
            <Link href="/forgot-password" className="inline-block mt-2 text-xs text-primary font-bold border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all">
              Change Password
            </Link>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Order History
            </h2>
            {totalOrders > 0 && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {totalOrders}
              </span>
            )}
          </div>

          {totalOrders === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">No orders yet.</p>
              <Link href="/shop" className="text-sm text-primary font-bold hover:underline">
                Browse Store
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => {
                const orderId = String(order._id);
                const total = order.amounts?.total || 0;
                const status = order.status || "pending";
                const itemCount = order.items?.length || 0;

                return (
                  <Link
                    key={orderId}
                    href={`/profile/orders/${orderId}`}
                    className="block border border-border bg-background rounded-xl p-4 hover:border-primary transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          Order #{orderId.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(order.createdAt)} &middot; {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatMoney(total)}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-1">{status}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {totalOrders > 3 && (
                <Link href="/profile/orders" className="block text-center text-sm text-primary font-bold hover:underline mt-4">
                  View All {totalOrders} Orders
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
