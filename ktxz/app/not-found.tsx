import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-6xl font-black uppercase tracking-tighter">404</h1>
        <p className="text-muted-foreground text-sm">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-widest hover:brightness-90 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
