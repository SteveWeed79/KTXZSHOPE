"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { signUp } from "./userActions";
import Link from "next/link";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
            {isLogin ? "System Access" : "Create Identity"}
          </h1>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg mb-6 text-center font-mono uppercase">{error}</div>}

        {isLogin ? (
          /* LOGIN FORM */
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await signIn("credentials", { 
                email: formData.get("email"), 
                password: formData.get("password"), 
                callbackUrl: "/" 
            });
          }} className="space-y-4">
            <input name="email" type="email" placeholder="EMAIL" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
            <div className="space-y-2">
                <input name="password" type="password" placeholder="PASSWORD" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
                <div className="text-right px-1">
                    <Link href="/forgot-password" size="sm" className="text-[10px] text-gray-500 hover:text-green-500 uppercase tracking-widest font-bold">
                        Forgot Password?
                    </Link>
                </div>
            </div>
            <button className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-green-500 transition-all uppercase text-xs tracking-[0.2em]">
              Login
            </button>
          </form>
        ) : (
          /* UPGRADED SIGN UP FORM */
          <form action={signUp} className="space-y-4">
            <input name="name" type="text" placeholder="FULL NAME" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
            <input name="email" type="email" placeholder="EMAIL ADDRESS" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
            
            <div className="grid grid-cols-1 gap-4">
                <input name="password" type="password" placeholder="NEW PASSWORD" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
                <input name="confirmPassword" type="password" placeholder="VERIFY PASSWORD" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
            </div>
            <p className="text-[9px] text-gray-600 uppercase font-mono px-1">
                Security: Min. 8 characters, 1 letter, 1 number
            </p>

            <button className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-400 transition-all uppercase text-xs tracking-widest">
              Confirm Registration
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <button onClick={() => setIsLogin(!isLogin)} className="text-gray-500 text-[10px] uppercase hover:text-white font-bold tracking-widest">
            {isLogin ? "New to KTXZ? Register" : "Existing Member? Sign In"}
          </button>
        </div>
      </div>
    </main>
  );
}