import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link
              href="/"
              className="text-lg font-black tracking-[-0.08em] italic uppercase hover:text-primary transition-colors"
            >
              KTXZ
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The ultimate destination for Pokemon, Magic: The Gathering, and Yu-Gi-Oh! trading cards.
            </p>
          </div>

          {/* Shop */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Shop
            </h3>
            <div className="flex flex-col gap-2">
              <Link href="/shop" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Browse All Cards
              </Link>
              <Link href="/cart" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Shopping Cart
              </Link>
              <Link href="/support" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Account
            </h3>
            <div className="flex flex-col gap-2">
              <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/profile" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                My Account
              </Link>
              <Link href="/profile/orders" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Order History
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Legal
            </h3>
            <div className="flex flex-col gap-2">
              <Link href="/legal/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/legal/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/returns" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Return Policy
              </Link>
              <Link href="/legal/shipping" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Shipping Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            &copy; {currentYear} KTXZ Systems. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            Secure Transactions Powered by Stripe
          </p>
        </div>
      </div>
    </footer>
  );
}
