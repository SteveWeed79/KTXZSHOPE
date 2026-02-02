/**
 * ============================================================================
 * FILE: lib/emails/shippingNotification.ts
 * STATUS: NEW FILE (UPDATED BRANDING)
 * ============================================================================
 * 
 * Shipping Notification Email Template
 * Brand: White background, Black text, Red (#ff0000) accents
 */

interface OrderItem {
  name: string;
  quantity: number;
}

interface OrderData {
  orderNumber: string;
  email: string;
  items: OrderItem[];
  trackingNumber: string;
  carrier: string;
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const carriers: Record<string, string> = {
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  
  return carriers[carrier] || '#';
}

export function generateShippingNotificationEmail(order: OrderData, siteUrl: string) {
  const trackingUrl = getTrackingUrl(order.carrier, order.trackingNumber);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped - KTXZ</title>
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
                KTXZ<span style="color: #ff0000;">SHOP</span>
              </h1>
              <p style="margin: 12px 0 0 0; color: #cccccc; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600;">
                Package In Transit
              </p>
            </td>
          </tr>

          <!-- Shipping Badge -->
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e0e0e0;">
              <div style="display: inline-block; background-color: #ffffff; border: 3px solid #2196f3; padding: 16px 32px;">
                <span style="font-size: 32px; font-weight: 900;">📦</span>
                <span style="color: #000000; font-weight: 900; font-size: 18px; margin-left: 12px; text-transform: uppercase; letter-spacing: 2px;">
                  Your Order Has Shipped
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
                    <p style="margin: 8px 0 0 0; color: #000000; font-size: 28px; font-weight: 900; letter-spacing: 2px; font-style: italic;">#${order.orderNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tracking Info -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="background-color: #ffffff; border: 3px solid #000000; padding: 40px; text-align: center;">
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Tracking Number</p>
                <p style="margin: 0 0 12px 0; color: #ff0000; font-size: 32px; font-weight: 900; letter-spacing: 3px; font-family: 'Courier New', monospace;">${order.trackingNumber}</p>
                <p style="margin: 0 0 32px 0; color: #000000; font-size: 16px; font-weight: 700; text-transform: uppercase;">Carrier: ${order.carrier}</p>
                
                <a href="${trackingUrl}" style="display: inline-block; background-color: #ff0000; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 2px; border: 2px solid #ff0000; font-style: italic;">
                  Track Package →
                </a>
              </div>
            </td>
          </tr>

          <!-- Items Shipped -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="border-top: 2px solid #000000; padding-top: 32px;">
                <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-style: italic;">
                  Items in This Shipment
                </h2>
                
                <div style="border: 2px solid #000000; background-color: #ffffff; padding: 24px;">
                  ${order.items.map((item, idx) => `
                    <div style="padding: 12px 0; ${idx < order.items.length - 1 ? 'border-bottom: 1px solid #e0e0e0;' : ''}">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color: #000000; font-size: 15px; font-weight: 700;">${item.name}</td>
                          <td style="text-align: right; color: #666666; font-size: 15px; font-weight: 700;">Qty: ${item.quantity}</td>
                        </tr>
                      </table>
                    </div>
                  `).join('')}
                </div>
              </div>
            </td>
          </tr>

          <!-- Shipping Address -->
          ${order.shippingAddress ? `
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="border-top: 2px solid #000000; padding-top: 32px;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-style: italic;">
                  Shipping To
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

          <!-- Delivery Info -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="background-color: #f5f5f5; border: 2px solid #000000; padding: 24px;">
                <p style="margin: 0 0 16px 0; color: #000000; font-size: 15px; font-weight: 900;">📍 DELIVERY INFORMATION</p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #666666; font-size: 14px; line-height: 1.8; font-weight: 600;">
                  <li>Estimated delivery: 3-7 business days</li>
                  <li>Signature may be required</li>
                  <li>Package is insured and tracked</li>
                  <li>Contact carrier directly for delivery updates</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #000000; padding: 40px; border-top: 4px solid #ff0000; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #cccccc; font-size: 13px; line-height: 1.8; font-weight: 600;">
                Questions about your order?<br>
                Contact us at ${siteUrl}
              </p>
              <p style="margin: 0 0 20px 0;">
                <a href="${siteUrl}" style="display: inline-block; background-color: #ff0000; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; border: 2px solid #ff0000; font-style: italic;">
                  Visit Shop
                </a>
              </p>
              <p style="margin: 0; color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                KTXZ SYSTEMS // PACKAGE IN TRANSIT
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
KTXZ SHOP - Your Order Has Shipped

Order Number: #${order.orderNumber}

TRACKING INFORMATION:
Tracking Number: ${order.trackingNumber}
Carrier: ${order.carrier}
Track at: ${trackingUrl}

ITEMS IN THIS SHIPMENT:
${order.items.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n')}

${order.shippingAddress ? `
SHIPPING TO:
${order.shippingAddress.name || ''}
${order.shippingAddress.line1 || ''}
${order.shippingAddress.line2 || ''}
${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postalCode || ''}
${order.shippingAddress.country || ''}
` : ''}

DELIVERY INFORMATION:
- Estimated delivery: 3-7 business days
- Signature may be required
- Package is insured and tracked
- Contact carrier directly for delivery updates

Visit: ${siteUrl}

KTXZ SYSTEMS // PACKAGE IN TRANSIT
  `.trim();

  return { html, text };
}