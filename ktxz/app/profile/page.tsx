import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();

  // Redirect if not logged in
  if (!session || !session.user) {
    redirect("/login");
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) return <div>User not found.</div>;

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
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Security Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-600 uppercase mb-1">Registered Email</label>
              <p className="text-sm font-bold">{user.email}</p>
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 uppercase mb-1">Status</label>
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

        {/* Placeholder for TCG Stats */}
        <div className="bg-gray-900/20 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 mb-4 opacity-20">
             {/* Simple Icon Placeholder */}
             <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 12l11 10 11-10L12 2zm0 17.5L4.5 12 12 4.5 19.5 12 12 19.5z"/></svg>
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Order History</h2>
          <p className="text-[10px] text-gray-700 uppercase">No transmissions found in the archive</p>
        </div>

      </div>
    </main>
  );
}