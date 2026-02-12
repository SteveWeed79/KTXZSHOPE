import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LayoutDashboard, Package, Star, Settings, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin =
    session?.user?.email === process.env.ADMIN_EMAIL ||
    (session?.user as { role?: string })?.role === "admin";

  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-foreground text-background sticky top-0 h-screen">
        <div className="p-6 border-b border-background/10">
          <Link
            href="/admin"
            className="text-lg font-black tracking-[-0.08em] italic uppercase"
          >
            KTXZ
          </Link>
          <p className="text-[9px] uppercase tracking-widest opacity-50 mt-1">
            Admin
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100 hover:bg-background/10 transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100 hover:bg-background/10 transition-all"
          >
            <Package className="h-4 w-4" />
            Orders
          </Link>
          <Link
            href="/admin#featured"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100 hover:bg-background/10 transition-all"
          >
            <Star className="h-4 w-4" />
            Featured
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100 hover:bg-background/10 transition-all"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-background/10">
          <Link
            href="/shop"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide opacity-50 hover:opacity-100 hover:bg-background/10 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Mobile nav bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-foreground text-background border-t border-background/10 flex justify-around py-2">
        <Link href="/admin" className="flex flex-col items-center gap-1 px-3 py-1.5 opacity-70 hover:opacity-100 transition-all">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[8px] uppercase font-bold tracking-wide">Dashboard</span>
        </Link>
        <Link href="/admin/orders" className="flex flex-col items-center gap-1 px-3 py-1.5 opacity-70 hover:opacity-100 transition-all">
          <Package className="h-4 w-4" />
          <span className="text-[8px] uppercase font-bold tracking-wide">Orders</span>
        </Link>
        <Link href="/admin/settings" className="flex flex-col items-center gap-1 px-3 py-1.5 opacity-70 hover:opacity-100 transition-all">
          <Settings className="h-4 w-4" />
          <span className="text-[8px] uppercase font-bold tracking-wide">Settings</span>
        </Link>
        <Link href="/shop" className="flex flex-col items-center gap-1 px-3 py-1.5 opacity-70 hover:opacity-100 transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[8px] uppercase font-bold tracking-wide">Store</span>
        </Link>
      </div>

      {/* Content */}
      <main className="flex-1 min-h-screen pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
