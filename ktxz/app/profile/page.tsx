/**
 * ============================================================================
 * FILE: ktxz/app/profile/page.tsx
 * STATUS: MODIFIED (Added order history section)
 * ============================================================================
 * 
 * User profile page with account info and recent orders
 */

import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatDate(date: Date | string | undefined | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email });
  if (!user) return <div>User not found.</div>;

  const userId = String(user._id);

  // Load recent orders (last 3)
  const recentOrders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const totalOrders = await Order.countDocuments({ user: userId });

  return (
    <main className="py-12 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-gray-900 pb-12">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center text-4xl font-black text-white border-4 border-black ring-4 ring-red-900/30">
            {user.name?.charAt(0) || "U"}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
            Level 1
          </div>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            {user.name}
          </h1>
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">
            ID: {user._id.toString().slice(-8)} // MEMBER SINCE {new Date(user.createdAt).getFullYear()}
          </p>
          <div className="mt-4 flex gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-md uppercase">
              {user.role}
            </span>
            <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-gray-400 text-[10px] font-bold rounded-md uppercase">
              Verified Operative
            </span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account Details Card */}
        <div className="bg-gray-900/20 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">
            Security Credentials
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-600 uppercase mb-1">
                Registered Email
              </label>
              <p className="text-sm font-bold">{user.email}</p>
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 uppercase mb-1">
                Status
              </label>
              <p className="text-sm font-bold text-green-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active
              </p>
            </div>
            <Link href="/forgot-password">
              <button className="mt-4 text-[10px] text-red-500 font-black uppercase border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                Update Password
              </button>
            </Link>
          </div>
        </div>

        {/* Order History Card */}
        <div className="bg-gray-900/20 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
              Order History
            </h2>
            {totalOrders > 0 && (
              <span className="text-[10px] font-mono text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                {totalOrders}
              </span>
            )}
          </div>

          {totalOrders === 0 ? (
            /* No Orders Yet */
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 opacity-20">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 12l11 10 11-10L12 2zm0 17.5L4.5 12 12 4.5 19.5 12 12 19.5z"/>
                </svg>
              </div>
              <p className="text-[10px] text-gray-700 uppercase mb-4">
                No transmissions found in the archive
              </p>
              <Link href="/shop" className="text-[10px] text-red-500 font-black uppercase hover:underline">
                Browse Inventory →
              </Link>
            </div>
          ) : (
            /* Recent Orders */
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
                    className="block border border-gray-900 bg-black/40 rounded-xl p-4 hover:border-red-600 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black uppercase tracking-tight text-xs truncate">
                          Order #{orderId.slice(-8)}
                        </p>
                        <p className="text-gray-600 text-[9px] font-mono uppercase tracking-[0.3em] mt-1">
                          {formatDate(order.createdAt)} • {itemCount} Item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold text-sm">
                          {formatMoney(total)}
                        </p>
                        <p className="text-gray-600 text-[9px] uppercase font-mono tracking-widest mt-1">
                          {status}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {totalOrders > 3 && (
                <Link
                  href="/profile/orders"
                  className="block text-center text-[10px] text-red-500 font-black uppercase tracking-[0.2em] hover:underline mt-4"
                >
                  View All {totalOrders} Orders →
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}