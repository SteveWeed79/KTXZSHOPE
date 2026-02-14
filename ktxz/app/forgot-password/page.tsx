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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border">
        <h1 className="text-2xl brand-heading-italic mb-2">Recover Access</h1>
        <p className="text-muted-foreground text-[10px] uppercase mb-8">Enter email to receive a secure reset link</p>

        <form action={handleSubmit} className="space-y-4">
          <input name="email" type="email" placeholder="ACCOUNT EMAIL" required className="w-full bg-background border border-border p-4 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground" />
          <button className="w-full btn-primary py-4">
            Send Reset Link
          </button>
        </form>
      </div>
    </main>
  );
}
