import type { Metadata } from "next";

export const metadata: Metadata = { title: "Return Policy | KTXZ" };

export default function ReturnsPage() {
  return (
    <article>
      <h2>Return Policy</h2>
      <p>Last updated: February 2026</p>

      <h2>1. General Return Policy</h2>
      <p>
        Due to the nature of collectible trading cards, all sales are generally
        final. We understand that issues can arise, and we handle returns on a
        case-by-case basis.
      </p>

      <h2>2. Eligible Returns</h2>
      <p>We accept returns in the following situations:</p>
      <ul>
        <li>Item received is significantly different from the listing description</li>
        <li>Item was damaged during shipping</li>
        <li>Wrong item was sent</li>
        <li>Item is missing from a fulfilled order</li>
      </ul>

      <h2>3. Return Window</h2>
      <p>
        Return requests must be submitted within 7 days of receiving your order.
        Contact our support team with your order number and photos of the issue.
      </p>

      <h2>4. Return Process</h2>
      <p>To initiate a return:</p>
      <ul>
        <li>Contact us through the Support page with your order number</li>
        <li>Provide clear photos showing the issue</li>
        <li>Wait for our team to review and approve the return</li>
        <li>Ship the item back using a provided return label (if approved)</li>
      </ul>

      <h2>5. Refunds</h2>
      <p>
        Approved refunds are processed to the original payment method via Stripe.
        Refunds typically appear within 5-10 business days depending on your bank.
      </p>

      <h2>6. Non-Returnable Items</h2>
      <p>The following are not eligible for return:</p>
      <ul>
        <li>Items that have been tampered with or altered after delivery</li>
        <li>Items returned without prior approval</li>
        <li>Items where the condition matches the listing description</li>
      </ul>

      <h2>7. Disputes</h2>
      <p>
        If you believe there is an issue with your order, contact us before filing
        a chargeback. We are committed to resolving issues fairly and promptly.
      </p>
    </article>
  );
}
