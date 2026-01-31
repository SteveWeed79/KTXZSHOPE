"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { signUp } from "./userActions";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ProviderMap = Record<string, { id: string; name: string; type: string }>;

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OAuth availability
  const [providers, setProviders] = useState<ProviderMap | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  // PASSWORD STATE (For live validation)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProviders() {
      try {
        setProvidersLoading(true);
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        if (!res.ok) throw new Error(`providers ${res.status}`);
        const data = (await res.json()) as ProviderMap;
        if (alive) setProviders(data);
      } catch {
        // If Auth is misconfigured, this can fail. Don't hard-crash the page.
        if (alive) setProviders(null);
      } finally {
        if (alive) setProvidersLoading(false);
      }
    }

    loadProviders();
    return () => {
      alive = false;
    };
  }, []);

  const hasGoogle = !!providers?.google;

  // LIVE VALIDATION LOGIC
  const validation = useMemo(() => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasLength = password.length >= 8;
    const matches = password === confirmPassword && password !== "";
    return { hasLetter, hasNumber, hasLength, matches };
  }, [password, confirmPassword]);

  const canRegister =
    isLogin ||
    (validation.hasLetter &&
      validation.hasNumber &&
      validation.hasLength &&
      validation.matches);

  // REGISTRATION HANDLER
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");
    const pass = String(formData.get("password") || "");

    const result = await signUp(formData);

    if ((result as any)?.error) {
      setError((result as any).error);
      setLoading(false);
      return;
    }

    if ((result as any)?.success) {
      // Auto-Login after successful registration
      const loginResult = await signIn("credentials", {
        email,
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
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-md">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            {isLogin ? "Access Portal" : "Initiate Protocol"}
          </h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">
            {isLogin
              ? "Authenticate to proceed."
              : "Create a new operative identity."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg mb-6 text-center font-mono uppercase">
            {error}
          </div>
        )}

        {isLogin ? (
          /* LOGIN FORM */
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError("");

              const formData = new FormData(e.currentTarget);
              const email = String(formData.get("email") || "");
              const password = String(formData.get("password") || "");

              const result = await signIn("credentials", {
                email,
                password,
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
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-gray-500 hover:text-red-600 uppercase tracking-widest font-bold"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs tracking-[0.2em] disabled:opacity-50"
            >
              {loading ? "Authenticating." : "Login"}
            </button>

            {/* OAuth */}
            {!providersLoading && hasGoogle && (
              <>
                <div className="flex items-center gap-4 pt-2">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">
                    Or continue with
                  </span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError("");
                    setLoading(true);
                    await signIn("google", { callbackUrl: "/" });
                    setLoading(false);
                  }}
                  className="w-full border border-gray-800 bg-black text-white font-black py-4 rounded-xl hover:border-red-600 transition-all uppercase text-xs tracking-[0.2em] disabled:opacity-50"
                >
                  Google Identity
                </button>
              </>
            )}
          </form>
        ) : (
          /* SIGN UP FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              name="name"
              type="text"
              placeholder="FULL NAME"
              required
              className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="EMAIL ADDRESS"
              required
              className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all text-sm"
            />

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
                  confirmPassword && !validation.matches
                    ? "border-red-600"
                    : "border-gray-800 focus:border-red-600"
                }`}
              />
            </div>

            <div className="text-[10px] uppercase tracking-widest space-y-2 text-gray-500 font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    validation.hasLetter ? "bg-green-500" : "bg-gray-700"
                  }`}
                />
                Must contain letters
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    validation.hasNumber ? "bg-green-500" : "bg-gray-700"
                  }`}
                />
                Must contain numbers
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    validation.hasLength ? "bg-green-500" : "bg-gray-700"
                  }`}
                />
                Must be 8+ characters
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    validation.matches ? "bg-green-500" : "bg-gray-700"
                  }`}
                />
                Passwords must match
              </div>
            </div>

            <button
              disabled={loading || !canRegister}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs tracking-[0.2em] disabled:opacity-50"
            >
              {loading ? "Deploying Identity." : "Register"}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-gray-800 pt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="w-full text-gray-500 text-[10px] uppercase hover:text-white font-bold tracking-widest"
          >
            {isLogin ? "New to KTXZ? Register" : "Existing Member? Sign In"}
          </button>
        </div>
      </div>
    </main>
  );
}
