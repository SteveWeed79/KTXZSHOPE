import { resetPassword } from "../../login/resetActions";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border">
        <h1 className="text-2xl brand-heading mb-6">New Password</h1>

        <form action={resetPassword} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <input name="password" type="password" placeholder="NEW PASSWORD" required className="w-full bg-background border border-border p-4 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-foreground placeholder:text-muted-foreground" />
          <input name="confirmPassword" type="password" placeholder="CONFIRM NEW PASSWORD" required className="w-full bg-background border border-border p-4 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-foreground placeholder:text-muted-foreground" />
          <button className="w-full btn-primary py-4">
            Update Password
          </button>
        </form>
      </div>
    </main>
  );
}
