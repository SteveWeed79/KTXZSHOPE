"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { signUp } from "./userActions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // PASSWORD STATE (For live validation)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // LIVE VALIDATION LOGIC
  const validation = useMemo(() => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasLength = password.length >= 8;
    const matches = password === confirmPassword && password !== "";
    return { hasLetter, hasNumber, hasLength, matches };
  }, [password, confirmPassword]);

  const canRegister = isLogin || (
    validation.hasLetter && validation.hasNumber && validation.hasLength && validation.matches
  );

  // REGISTRATION HANDLER
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const pass = formData.get("password") as string;

    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.success) {
      // Auto-Login after successful registration
      const loginResult = await signIn("credentials", {
        email: email,
        password: pass,
        redirect: false,
      });

      if (loginResult?.error) {
        setIsLogin(true);
        setError("Account created! Please sign in manually.");
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-gray-900/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            {isLogin ? "System Access" : "Create Identity"}
          </h1>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-2">
            KTXZ Sector // 109.22.01
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg mb-6 text-center font-mono uppercase">
            {error}
          </div>
        )}

        {isLogin ? (
          /* FULL LOGIN FORM */
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const formData = new FormData(e.currentTarget);
              const result = await signIn("credentials", { 
                email: formData.get("email"), 
                password: formData.get("password"), 
                redirect: false,
              });
              if (result?.error) {
                setError("Invalid Credentials");
                setLoading(false);
              } else {
                router.push("/");
              }
            }} 
            className="space-y-4"
          >
            <input 
              name="email" 
              type="email" 
              placeholder="EMAIL" 
              required 
              className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm" 
            />
            <div className="space-y-2">
              <input 
                name="password" 
                type="password" 
                placeholder="PASSWORD" 
                required 
                className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm" 
              />
              <div className="text-right px-1">
                <Link href="/forgot-password" size="sm" className="text-[10px] text-gray-500 hover:text-red-600 uppercase tracking-widest font-bold">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <button 
              disabled={loading} 
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs tracking-[0.2em] disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
        ) : (
          /* FULL SIGN UP FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <input name="name" type="text" placeholder="FULL NAME" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm" />
            <input name="email" type="email" placeholder="EMAIL ADDRESS" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm" />
            
            <div className="grid grid-cols-1 gap-4">
              <input 
                name="password" 
                type="password" 
                placeholder="NEW PASSWORD" 
                required 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm" 
              />
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="VERIFY PASSWORD" 
                required 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-black border p-4 rounded-xl outline-none transition-all text-sm ${
                  confirmPassword && !validation.matches ? 'border-red-600/50' : 'border-gray-800'
                }`} 
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
               <span className={`text-[9px] uppercase font-mono ${validation.hasLength ? 'text-green-500' : 'text-gray-600'}`}>
                 {validation.hasLength ? '✓' : '○'} 8+ Chars
               </span>
               <span className={`text-[9px] uppercase font-mono ${validation.hasLetter ? 'text-green-500' : 'text-gray-600'}`}>
                 {validation.hasLetter ? '✓' : '○'} 1+ Letter
               </span>
               <span className={`text-[9px] uppercase font-mono ${validation.hasNumber ? 'text-green-500' : 'text-gray-600'}`}>
                 {validation.hasNumber ? '✓' : '○'} 1+ Number
               </span>
               {confirmPassword && !validation.matches && (
                 <span className="text-[9px] uppercase font-mono text-red-500 w-full mt-1 font-bold">
                   ! Passwords do not match
                 </span>
               )}
            </div>

            <button 
              disabled={!canRegister || loading}
              className={`w-full font-black py-4 rounded-xl transition-all uppercase text-xs tracking-widest ${
                canRegister && !loading
                ? "bg-red-600 text-white hover:bg-red-500 cursor-pointer" 
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? "Initializing..." : canRegister ? "Confirm Registration" : "Locked"}
            </button>
          </form>
        )}

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-800"></span>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#0b0c0d] px-2 text-gray-600 font-mono tracking-widest">or continue with</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full border border-gray-800 text-white font-bold py-4 rounded-xl hover:bg-white hover:text-black transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google Identity
        </button>

        <div className="text-center mt-6">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }} 
            className="text-gray-500 text-[10px] uppercase hover:text-white font-bold tracking-widest"
          >
            {isLogin ? "New to KTXZ? Register" : "Existing Member? Sign In"}
          </button>
        </div>
      </div>
    </main>
  );
}