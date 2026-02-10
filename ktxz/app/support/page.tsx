import { Mail, Clock } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tighter uppercase">Support</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Have a question or need help with an order? Reach out below.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl">
              <form action="/api/support" method="post" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Name
                    </label>
                    <input
                      name="name"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Subject
                  </label>
                  <select
                    name="subject"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  >
                    <option value="order">Order Issue</option>
                    <option value="shipping">Shipping Question</option>
                    <option value="returns">Returns & Refunds</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:brightness-90 transition-all"
                >
                  Send Inquiry
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-xs font-bold uppercase text-primary tracking-widest">
                Email Us
              </p>
              <p className="text-sm font-medium">support@ktxz.shop</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl space-y-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                Response Time
              </p>
              <p className="text-sm">
                We typically respond within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
