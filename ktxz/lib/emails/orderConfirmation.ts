/**
 * ============================================================================
 * FILE: lib/emails/orderConfirmation.ts
 * STATUS: NEW FILE (UPDATED BRANDING)
 * ============================================================================
 * 
 * Order Confirmation Email Template
 * Brand: White background, Black text, Red (#ff0000) accents
 */

interface OrderItem {
  name: string;
  image?: string;
  brandName?: string;
  rarity?: string;
  unitPrice: number;
  quantity: number;
}

interface OrderData {
  orderNumber: string;
  email: string;
  items: OrderItem[];
  amounts: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: string;
}

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export function generateOrderConfirmationEmail(order: OrderData, siteUrl: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - KTXZ</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px solid #000000; border-radius: 0; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 40px; text-align: center; border-bottom: 4px solid #ff0000;">
              <h1 style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 900; letter-spacing: -2px; text-transform: uppercase; font-style: italic;">
                KTXZ
              </h1>
              <p style="margin: 12px 0 0 0; color: #cccccc; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600;">
                Elite Trading Card Acquisitions
              </p>
            </td>
          </tr>

          <!-- Success Badge -->
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e0e0e0;">
              <div style="display: inline-block; background-color: #ffffff; border: 3px solid #00c853; padding: 16px 32px;">
                <span style="color: #00c853; font-size: 32px; font-weight: 900;">✓</span>
                <span style="color: #000000; font-weight: 900; font-size: 18px; margin-left: 12px; text-transform: uppercase; letter-spacing: 2px;">
                  Order Confirmed
                </span>
              </div>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #666666; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Order Number</p>
                    <p style="margin: 8px 0 0 0; color: #000000; font-size: 32px; font-weight: 900; letter-spacing: 2px; font-style: italic;">#${order.orderNumber}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #666666; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Order Date</p>
                    <p style="margin: 8px 0 0 0; color: #000000; font-size: 16px; font-weight: 600;">${new Date(order.createdAt).toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="border-top: 2px solid #000000; padding-top: 32px;">
                <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-style: italic;">
                  Order Items
                </h2>
                
                ${order.items.map(item => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border: 2px solid #000000; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align: top;">
                              <p style="margin: 0 0 6px 0; color: #000000; font-size: 16px; font-weight: 900; text-transform: uppercase;">${item.name}</p>
                              <p style="margin: 0; color: #666666; font-size: 13px; font-weight: 600;">${item.brandName || ''} ${item.rarity ? '• ' + item.rarity : ''}</p>
                              <p style="margin: 10px 0 0 0; color: #000000; font-size: 13px; font-weight: 700;">Qty: ${item.quantity}</p>
                            </td>
                            <td style="text-align: right; vertical-align: top; white-space: nowrap;">
                              <p style="margin: 0; color: #ff0000; font-size: 20px; font-weight: 900;">${formatPrice(item.unitPrice * item.quantity)}</p>
                              <p style="margin: 6px 0 0 0; color: #666666; font-size: 13px; font-weight: 600;">${formatPrice(item.unitPrice)} each</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                `).join('')}
              </div>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #000000; padding-top: 24px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 15px; font-weight: 600;">Subtotal</p>
                  </td>
                  <td style="text-align: right; padding: 10px 0;">
                    <p style="margin: 0; color: #000000; font-size: 15px; font-weight: 700;">${formatPrice(order.amounts.subtotal)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 15px; font-weight: 600;">Shipping</p>
                  </td>
                  <td style="text-align: right; padding: 10px 0;">
                    <p style="margin: 0; color: #000000; font-size: 15px; font-weight: 700;">${formatPrice(order.amounts.shipping)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 15px; font-weight: 600;">Tax</p>
                  </td>
                  <td style="text-align: right; padding: 10px 0;">
                    <p style="margin: 0; color: #000000; font-size: 15px; font-weight: 700;">${formatPrice(order.amounts.tax)}</p>
                  </td>
                </tr>
                <tr style="border-top: 3px solid #ff0000;">
                  <td style="padding: 20px 0 0 0;">
                    <p style="margin: 0; color: #000000; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-style: italic;">Total</p>
                  </td>
                  <td style="text-align: right; padding: 20px 0 0 0;">
                    <p style="margin: 0; color: #ff0000; font-size: 32px; font-weight: 900;">${formatPrice(order.amounts.total)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          ${order.shippingAddress ? `
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="border-top: 2px solid #000000; padding-top: 32px;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-style: italic;">
                  Shipping Address
                </h2>
                <div style="color: #666666; font-size: 15px; line-height: 1.8; font-weight: 600;">
                  ${order.shippingAddress.name ? `<p style="margin: 0 0 4px 0; color: #000000; font-weight: 900;">${order.shippingAddress.name}</p>` : ''}
                  ${order.shippingAddress.line1 ? `<p style="margin: 0;">${order.shippingAddress.line1}</p>` : ''}
                  ${order.shippingAddress.line2 ? `<p style="margin: 0;">${order.shippingAddress.line2}</p>` : ''}
                  ${order.shippingAddress.city ? `<p style="margin: 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>` : ''}
                  ${order.shippingAddress.country ? `<p style="margin: 0;">${order.shippingAddress.country}</p>` : ''}
                </div>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #000000; padding: 40px; border-top: 4px solid #ff0000; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #cccccc; font-size: 13px; line-height: 1.8; font-weight: 600;">
                You'll receive a shipping notification once your order ships.<br>
                Track your order status anytime.
              </p>
              <p style="margin: 0 0 20px 0;">
                <a href="${siteUrl}" style="display: inline-block; background-color: #ff0000; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; border: 2px solid #ff0000; font-style: italic;">
                  Visit KTXZ
                </a>
              </p>
              <p style="margin: 0; color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                KTXZ SYSTEMS // SECURE TRANSACTION
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
KTXZ - Order Confirmation

Order Number: #${order.orderNumber}
Date: ${new Date(order.createdAt).toLocaleString()}

ORDER ITEMS:
${order.items.map(item => `
- ${item.name}
  ${item.brandName || ''} ${item.rarity ? '• ' + item.rarity : ''}
  Qty: ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.unitPrice * item.quantity)}
`).join('')}

SUMMARY:
Subtotal: ${formatPrice(order.amounts.subtotal)}
Shipping: ${formatPrice(order.amounts.shipping)}
Tax: ${formatPrice(order.amounts.tax)}
TOTAL: ${formatPrice(order.amounts.total)}

${order.shippingAddress ? `
SHIPPING ADDRESS:
${order.shippingAddress.name || ''}
${order.shippingAddress.line1 || ''}
${order.shippingAddress.line2 || ''}
${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postalCode || ''}
${order.shippingAddress.country || ''}
` : ''}

You'll receive a shipping notification once your order ships.

Visit: ${siteUrl}

KTXZ SYSTEMS // SECURE TRANSACTION
  `.trim();

  return { html, text };
}