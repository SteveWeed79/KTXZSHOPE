import type { NextConfig } from "next";

// Resolve the S3/CloudFront origin at build time so we can lock down both
// next/image remotePatterns and the CSP connect-src to the real hostname.
// Falls back to wildcard when S3 is not configured (local dev without S3).
const s3Hostname: string | null = process.env.AWS_CLOUDFRONT_DOMAIN
  ? process.env.AWS_CLOUDFRONT_DOMAIN
  : process.env.AWS_S3_BUCKET && process.env.AWS_REGION
  ? `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth user avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Seed / dev placeholder images
      { protocol: "https", hostname: "picsum.photos" },
      // S3 / CloudFront — locked to the configured bucket or CDN domain.
      // When neither AWS_CLOUDFRONT_DOMAIN nor AWS_S3_BUCKET+AWS_REGION are
      // set (e.g. local dev without S3), the wildcard fallback keeps the app
      // functional for externally-hosted images.
      s3Hostname
        ? { protocol: "https", hostname: s3Hostname }
        : { protocol: "https", hostname: "**" },
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
              // s3Origin added so the browser can PUT files directly to S3 via
              // presigned URLs without routing uploads through the Next.js server.
              `connect-src 'self' https://api.stripe.com https://accounts.google.com ${
                s3Hostname ? `https://${s3Hostname}` : "https://*.amazonaws.com"
              }`,
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
