"use client";
import { toast } from "sonner";
import { requestPasswordReset } from "../login/resetActions";

export default function ForgotPasswordPage() {
  async function handleSubmit(formData: FormData) {
    const result = await requestPasswordReset(formData);
    if (result.success) {
      toast.success("Recovery link dispatched. Check your inbox.");
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-md">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Recover Access</h1>
        <p className="text-gray-500 text-[10px] uppercase mb-8">Enter email to receive a secure reset link</p>

        <form action={handleSubmit} className="space-y-4">
          <input name="email" type="email" placeholder="ACCOUNT EMAIL" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 transition-all text-sm" />
          <button className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-green-500 transition-all uppercase text-xs">
            Send Reset Link
          </button>
        </form>
      </div>
    </main>
  );
}