import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth user avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Seed / dev placeholder images
      { protocol: "https", hostname: "picsum.photos" },
      // TODO: Replace with your CDN hostname once an upload provider is
      // configured (e.g. res.cloudinary.com, utfs.io, etc.).
      // The wildcard is required until then because card image URLs are
      // admin-entered and can point to arbitrary HTTPS hosts.
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' removed — Stripe.js v3 does not require it.
              // If a future dependency reintroduces it, document the reason here.
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com https://accounts.google.com",
              "frame-src https://js.stripe.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

