import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping Policy | KTXZ" };

export default function ShippingPage() {
  return (
    <article>
      <h2>Shipping Policy</h2>
      <p>Last updated: February 2026</p>

      <h2>1. Shipping Methods</h2>
      <p>We offer the following shipping options:</p>
      <ul>
        <li>
          <strong>Standard Shipping ($8.99)</strong> - Estimated delivery: 3-7
          business days
        </li>
        <li>
          <strong>Local Pickup (Free)</strong> - Available for qualifying orders
        </li>
      </ul>

      <h2>2. Processing Time</h2>
      <p>
        Orders are typically processed within 1-2 business days after payment
        confirmation. During high-volume periods (releases, promotions), processing
        may extend to 3-5 business days.
      </p>

      <h2>3. Packaging</h2>
      <p>
        All cards are carefully packaged to prevent damage during transit. Single
        cards are placed in protective sleeves and top-loaders. Bulk orders are
        secured in rigid packaging.
      </p>

      <h2>4. Shipping Area</h2>
      <p>
        We currently ship to addresses within the United States only. International
        shipping is not available at this time.
      </p>

      <h2>5. Tracking</h2>
      <p>
        Tracking information is provided via email once your order has been shipped.
        You can also view tracking details in your order history.
      </p>

      <h2>6. Lost or Damaged Shipments</h2>
      <p>
        If your package appears lost or arrives damaged, contact us within 7 days
        of the expected delivery date. We will work with the carrier to resolve
        the issue and may reship or refund your order.
      </p>

      <h2>7. Address Accuracy</h2>
      <p>
        Please ensure your shipping address is correct at checkout. We are not
        responsible for packages delivered to incorrect addresses provided by the
        customer. Address changes after order placement may not be possible.
      </p>

      <h2>8. Tax</h2>
      <p>
        Applicable sales tax is calculated automatically at checkout based on your
        shipping address and current tax regulations.
      </p>
    </article>
  );
}
