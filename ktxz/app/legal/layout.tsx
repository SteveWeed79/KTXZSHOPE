import Link from "next/link";

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/returns", label: "Return Policy" },
  { href: "/legal/shipping", label: "Shipping Policy" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[80vh] section-spacing max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl brand-heading">Legal</h1>
        <nav className="flex flex-wrap gap-4 mt-4">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors font-bold"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-8 [&_h2]:mb-4 [&_p]:text-muted-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:text-muted-foreground [&_ul]:text-sm [&_li]:text-muted-foreground [&_li]:text-sm">
        {children}
      </div>
    </main>
  );
}
