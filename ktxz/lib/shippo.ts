/**
 * ============================================================================
 * FILE: lib/shippo.ts
 * ============================================================================
 *
 * Typed Shippo REST client — no SDK dependency, uses native fetch.
 *
 * Required env vars for label purchasing:
 *   SHIPPO_API_KEY          — Shippo API token (from app.goshippo.com)
 *   SHIPPO_FROM_NAME        — Sender name
 *   SHIPPO_FROM_STREET      — Sender street address
 *   SHIPPO_FROM_CITY        — Sender city
 *   SHIPPO_FROM_STATE       — Sender 2-letter state code (e.g. CA)
 *   SHIPPO_FROM_ZIP         — Sender ZIP code
 *   SHIPPO_FROM_COUNTRY     — (optional) Sender country code, default "US"
 *   SHIPPO_FROM_PHONE       — (optional) Sender phone number
 *   SHIPPO_FROM_EMAIL       — (optional) Sender email address
 */

const SHIPPO_API_BASE = "https://api.goshippo.com";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ShippoRate {
  /** Shippo object_id — pass this to purchaseRate() */
  objectId: string;
  /** Carrier name, e.g. "USPS", "UPS" */
  provider: string;
  servicelevel: {
    /** Human-readable service name, e.g. "Priority Mail" */
    name: string;
    /** Machine token, e.g. "usps_priority" */
    token: string;
  };
  /** Rate price as a decimal string, e.g. "5.50" */
  amount: string;
  /** Currency code, e.g. "USD" */
  currency: string;
  /** Estimated transit days (may be 0 when unknown) */
  estimatedDays: number;
  /** Human-readable delivery estimate, e.g. "2 - 3 business days" */
  durationTerms: string;
}

export interface ShippoTransaction {
  objectId: string;
  status: "SUCCESS" | "QUEUED" | "WAITING" | "ERROR";
  /** Pre-signed URL to download the shipping label PDF */
  labelUrl: string;
  trackingNumber: string;
  /** URL for the carrier's tracking page */
  trackingUrlProvider: string;
  /** Carrier name (from the purchased rate) */
  carrier: string;
}

export interface CreateShipmentResult {
  shipmentObjectId: string;
  rates: ShippoRate[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function shippoFetch<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SHIPPO_API_KEY is not configured. Set it in your environment variables."
    );
  }

  const res = await fetch(`${SHIPPO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shippo API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Builds the "from" address for outgoing shipments from env vars.
 * Throws a descriptive error if any required var is absent.
 */
function getFromAddress() {
  const required = [
    "SHIPPO_FROM_NAME",
    "SHIPPO_FROM_STREET",
    "SHIPPO_FROM_CITY",
    "SHIPPO_FROM_STATE",
    "SHIPPO_FROM_ZIP",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(
        `Shippo from-address is incomplete: ${key} is not set. ` +
          "Configure all SHIPPO_FROM_* environment variables before purchasing labels."
      );
    }
  }

  return {
    name: process.env.SHIPPO_FROM_NAME!,
    street1: process.env.SHIPPO_FROM_STREET!,
    city: process.env.SHIPPO_FROM_CITY!,
    state: process.env.SHIPPO_FROM_STATE!,
    zip: process.env.SHIPPO_FROM_ZIP!,
    country: process.env.SHIPPO_FROM_COUNTRY ?? "US",
    phone: process.env.SHIPPO_FROM_PHONE,
    email: process.env.SHIPPO_FROM_EMAIL,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Shippo shipment against an order's shipping address and return
 * the list of available shipping rates for the admin to choose from.
 *
 * @param toAddress  Order's shipping address (from the Order model).
 * @param weightLb   Package weight in pounds (default 1).
 */
export async function createShipment(
  toAddress: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
  weightLb = 1
): Promise<CreateShipmentResult> {
  const fromAddress = getFromAddress();

  type RawRate = {
    object_id: string;
    provider: string;
    servicelevel: { name: string; token: string };
    amount: string;
    currency: string;
    estimated_days: number;
    duration_terms: string;
  };

  type RawShipment = {
    object_id: string;
    rates: RawRate[];
  };

  const raw = await shippoFetch<RawShipment>("POST", "/shipments/", {
    address_from: {
      name: fromAddress.name,
      street1: fromAddress.street1,
      city: fromAddress.city,
      state: fromAddress.state,
      zip: fromAddress.zip,
      country: fromAddress.country,
      phone: fromAddress.phone ?? undefined,
      email: fromAddress.email ?? undefined,
    },
    address_to: {
      name: toAddress.name ?? "",
      street1: toAddress.line1 ?? "",
      street2: toAddress.line2 ?? undefined,
      city: toAddress.city ?? "",
      state: toAddress.state ?? "",
      zip: toAddress.postalCode ?? "",
      country: toAddress.country ?? "US",
    },
    parcels: [
      {
        length: "10",
        width: "8",
        height: "2",
        distance_unit: "in",
        weight: String(weightLb),
        mass_unit: "lb",
      },
    ],
    async: false,
  });

  const rates: ShippoRate[] = (raw.rates ?? []).map((r) => ({
    objectId: r.object_id,
    provider: r.provider,
    servicelevel: r.servicelevel,
    amount: r.amount,
    currency: r.currency,
    estimatedDays: r.estimated_days,
    durationTerms: r.duration_terms,
  }));

  return { shipmentObjectId: raw.object_id, rates };
}

/**
 * Purchase a shipping label for the given Shippo rate object ID.
 * Returns a transaction containing the label URL and tracking number.
 *
 * Throws if the Shippo transaction status is not SUCCESS.
 */
export async function purchaseRate(
  rateObjectId: string
): Promise<ShippoTransaction> {
  type RawTransaction = {
    object_id: string;
    status: string;
    label_url: string;
    tracking_number: string;
    tracking_url_provider: string;
    rate: { provider: string } | string;
    messages?: { source: string; code: string; text: string }[];
  };

  const raw = await shippoFetch<RawTransaction>("POST", "/transactions/", {
    rate: rateObjectId,
    label_file_type: "PDF",
    async: false,
  });

  if (raw.status !== "SUCCESS") {
    const msgs = (raw.messages ?? []).map((m) => m.text).join("; ");
    throw new Error(
      `Shippo label purchase failed (status: ${raw.status})${msgs ? `: ${msgs}` : ""}`
    );
  }

  const carrier =
    typeof raw.rate === "object" && raw.rate !== null
      ? raw.rate.provider
      : "";

  return {
    objectId: raw.object_id,
    status: raw.status as ShippoTransaction["status"],
    labelUrl: raw.label_url,
    trackingNumber: raw.tracking_number,
    trackingUrlProvider: raw.tracking_url_provider,
    carrier,
  };
}
