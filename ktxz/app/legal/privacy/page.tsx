import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | KTXZ" };

export default function PrivacyPage() {
  return (
    <article>
      <h2>Privacy Policy</h2>
      <p>Last updated: February 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly:</p>
      <ul>
        <li>Account information (name, email, password)</li>
        <li>Shipping and billing addresses</li>
        <li>Order history and transaction details</li>
      </ul>
      <p>We also collect information automatically:</p>
      <ul>
        <li>Device and browser information</li>
        <li>IP address and general location</li>
        <li>Usage data and browsing patterns on our site</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Process and fulfill your orders</li>
        <li>Send order confirmations and shipping notifications</li>
        <li>Manage your account and provide customer support</li>
        <li>Prevent fraud and secure the platform</li>
        <li>Improve our products and services</li>
      </ul>

      <h2>3. Payment Processing</h2>
      <p>
        Payment information is processed securely by Stripe. We do not store your
        credit card numbers, CVV, or full payment details on our servers. Stripe&apos;s
        privacy policy governs their handling of your payment data.
      </p>

      <h2>4. Data Sharing</h2>
      <p>We do not sell your personal information. We share data only with:</p>
      <ul>
        <li>Stripe (payment processing)</li>
        <li>Shipping carriers (order fulfillment)</li>
        <li>Email service providers (transactional emails)</li>
        <li>Law enforcement (when legally required)</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for authentication and cart functionality. These
        are necessary for the site to operate and cannot be disabled.
      </p>

      <h2>6. Data Security</h2>
      <p>
        We implement industry-standard security measures including encrypted
        connections (HTTPS), hashed passwords, and secure session management.
        However, no method of transmission over the Internet is 100% secure.
      </p>

      <h2>7. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your account and data</li>
        <li>Opt out of marketing communications</li>
      </ul>

      <h2>8. Data Retention</h2>
      <p>
        We retain account and order data for as long as your account is active and
        as required for legal, tax, and business purposes. You may request account
        deletion at any time.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy periodically. We will notify you of
        significant changes via email or a prominent notice on our site.
      </p>

      <h2>10. Contact</h2>
      <p>
        For privacy-related questions or data requests, contact us through our
        Support page.
      </p>
    </article>
  );
}
