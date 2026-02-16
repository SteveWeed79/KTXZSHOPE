import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-6xl brand-heading">404</h1>
        <p className="text-muted-foreground text-sm">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="btn-primary inline-block"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
