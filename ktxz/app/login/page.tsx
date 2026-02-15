/**
 * ============================================================================
 * FILE: ktxz/app/login/page.tsx
 * ============================================================================
 *
 * Fix: After credentials login, use window.location.href for a hard navigation.
 * This guarantees the server tree (including Navbar session state) is fully
 * re-rendered from scratch, eliminating stale session UI.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { signUp } from "./userActions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ProviderMap = Record<string, { id: string; name: string; type: string }>;

export default function AuthPage() {
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = searchParams.get("next");
    if (!n || typeof n !== "string") return "/";
    // Must start with / but not // (protocol-relative URL = open redirect)
    if (!n.startsWith("/") || n.startsWith("//")) return "/";
    return n;
  }, [searchParams]);

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [providers, setProviders] = useState<ProviderMap | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

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

  const validation = useMemo(() => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasLength = password.length >= 8;
    const matches = password === confirmPassword && password !== "";
    return { hasLetter, hasNumber, hasLength, matches };
  }, [password, confirmPassword]);

  const canRegister =
    isLogin ||
    (validation.hasLetter && validation.hasNumber && validation.hasLength && validation.matches);

  /**
   * Hard navigate after login. window.location.href forces a full page load,
   * which guarantees the server-rendered Navbar picks up the new session.
   */
  function navigateAfterLogin(url: string) {
    window.location.href = url;
  }

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
      const loginResult = await signIn("credentials", {
        email,
        password: pass,
        redirect: false,
      });

      if (loginResult?.error) {
        setIsLogin(true);
        setError("Account created! Please sign in manually.");
        setLoading(false);
        return;
      }

      navigateAfterLogin(nextUrl);
      return;
    }

    setLoading(false);
  };

  const inputClass =
    "w-full bg-background border border-border p-4 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border">
        <div className="mb-8">
          <h1 className="text-3xl brand-heading">{isLogin ? "Sign In" : "Create Account"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? "Enter your credentials to continue." : "Set up your new account."}
          </p>
        </div>

        {error && (
          <div className="bg-primary/10 border border-primary/30 text-primary text-xs p-3 rounded-lg mb-6 text-center font-medium">
            {error}
          </div>
        )}

        {isLogin ? (
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
                return;
              }

              navigateAfterLogin(nextUrl);
            }}
            className="space-y-4"
          >
            <input name="email" type="email" placeholder="Email" required className={inputClass} />
            <div className="space-y-2">
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                className={inputClass}
              />
              <div className="text-right px-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button disabled={loading} className="w-full btn-primary py-4 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {!providersLoading && hasGoogle && (
              <>
                <div className="flex items-center gap-4 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError("");
                    setLoading(true);
                    await signIn("google", { callbackUrl: nextUrl });
                    setLoading(false);
                  }}
                  className="w-full border border-border bg-background text-foreground font-bold py-4 rounded-xl hover:border-primary transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  Continue with Google
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input name="name" type="text" placeholder="Full Name" required className={inputClass} />
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              required
              className={inputClass}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} ${
                confirmPassword && !validation.matches ? "!border-primary" : ""
              }`}
            />

            <div className="text-xs space-y-2 text-muted-foreground">
              {[
                { ok: validation.hasLetter, label: "Contains letters" },
                { ok: validation.hasNumber, label: "Contains numbers" },
                { ok: validation.hasLength, label: "8+ characters" },
                { ok: validation.matches, label: "Passwords match" },
              ].map((rule) => (
                <div key={rule.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${rule.ok ? "bg-primary" : "bg-muted"}`} />
                  {rule.label}
                </div>
              ))}
            </div>

            <button
              disabled={loading || !canRegister}
              className="w-full btn-primary py-4 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="w-full text-muted-foreground text-sm hover:text-foreground font-medium transition-colors"
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
