import { resetPassword } from "../../login/resetActions";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900/40 p-8 rounded-3xl border border-gray-800">
        <h1 className="text-2xl font-black text-white uppercase mb-6">New Password</h1>

        <form action={resetPassword} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <input name="password" type="password" placeholder="NEW PASSWORD" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 text-sm" />
          <input name="confirmPassword" type="password" placeholder="CONFIRM NEW PASSWORD" required className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-green-500 text-sm" />
          <button className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-400 transition-all uppercase text-xs">
            Update Password
          </button>
        </form>
      </div>
    </main>
  );
}