/**
 * WHY A CHECKOUT FAILED - pure, so it can be tested.
 *
 * Polar answers a refused checkout with a status and a JSON body. The
 * upgrade dialog used to swallow all of it into "Couldn't open checkout
 * just now", which told nobody anything. This turns the answer into:
 *   - a plain sentence for the buyer (never Polar's raw text);
 *   - the real reason for the founder (admin page and server logs);
 *   - whether trying again without some optional field could work.
 */

export interface CheckoutFailure {
  status: number | null;
  /** Polar's error name, e.g. "Unauthorized", "OrganizationNotReadyForPayments". */
  type: string | null;
  detail: string;
  /** Fields a validation error points at, e.g. ["body", "external_customer_id"]. */
  fields: string[];
}

export type CheckoutRetry = "drop-discount" | "drop-customer-link" | "drop-email" | null;

export interface CheckoutAdvice {
  /** Safe to show the buyer. */
  userMessage: string;
  /** For the founder: what's wrong and what to do. */
  adminReason: string;
  /** A field Polar objected to that the checkout can do without. */
  retry: CheckoutRetry;
}

function asText(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Reads a thrown Polar SDK error (or anything else) into one shape. */
export function readCheckoutError(error: unknown): CheckoutFailure {
  const e = (error ?? {}) as Record<string, unknown>;
  const status = typeof e.statusCode === "number" ? e.statusCode : typeof e.status === "number" ? e.status : null;
  let type: string | null = typeof e.error === "string" ? e.error : null;
  let detail = typeof e.detail === "string" ? e.detail : "";
  const fields: string[] = [];

  let body: unknown = e.body;
  if (typeof body === "string") {
    const raw = body;
    try {
      body = JSON.parse(raw);
    } catch {
      detail = detail || raw;
      body = null;
    }
  }
  const b = (body ?? (Array.isArray(e.detail) ? { detail: e.detail } : null)) as Record<string, unknown> | null;
  if (b && typeof b === "object") {
    if (typeof b.error === "string") type = b.error;
    if (typeof b.type === "string" && !type) type = b.type;
    if (typeof b.detail === "string") detail = b.detail;
    if (Array.isArray(b.detail)) {
      const parts: string[] = [];
      for (const d of b.detail as Record<string, unknown>[]) {
        if (Array.isArray(d?.loc)) fields.push(...(d.loc as unknown[]).map((x) => String(x)));
        if (d?.msg) parts.push(`${Array.isArray(d.loc) ? (d.loc as unknown[]).join(".") + ": " : ""}${asText(d.msg)}`);
      }
      detail = parts.join("; ") || detail;
    }
  }
  if (!detail && error instanceof Error) detail = error.message;
  if (!type && error instanceof Error && error.name && error.name !== "Error") type = error.name;
  return { status, type, detail: detail.slice(0, 400), fields };
}

const GENERIC = "Checkout didn't open. Please try again in a minute, or email advitya@work-ly.in and I'll sort it out for you.";
const PAUSED = "Payments are paused on our side for a moment. Please try again later today, or email advitya@work-ly.in and I'll sort it out for you.";

export function checkoutAdvice(f: CheckoutFailure): CheckoutAdvice {
  const said = `Polar said: ${[f.status, f.type].filter(Boolean).join(" ")}${f.detail ? ` - ${f.detail}` : ""}`;
  const fieldText = f.fields.join(".").toLowerCase();
  const text = `${f.type ?? ""} ${f.detail}`.toLowerCase();

  if (f.status === 401 || /unauthori[sz]ed|invalid_token|expired token|token.*(expired|revoked)/.test(text)) {
    return {
      userMessage: PAUSED,
      adminReason: `Polar rejected the access token. POLAR_ACCESS_TOKEN has expired or been revoked: create a new organization access token in Polar (Settings, then Developers) with no expiry, put it in Vercel and redeploy. ${said}`,
      retry: null,
    };
  }
  if (/organizationnotreadyforpayments|not ready (to accept|for) payments|payments? (are |is )?(not enabled|disabled)|under review/.test(text)) {
    return {
      userMessage: PAUSED,
      adminReason: `Polar says the organization can't take payments right now (account review, identity check or payout setup). Open the Polar dashboard: there will be a banner saying what it needs. ${said}`,
      retry: null,
    };
  }
  if (f.status === 403 || /notpermitted|insufficient.?scope/.test(text)) {
    return {
      userMessage: PAUSED,
      adminReason: `The Polar token isn't allowed to create checkouts. Make a new organization token with the checkouts:write scope (all scopes is simplest), put it in Vercel and redeploy. ${said}`,
      retry: null,
    };
  }
  if (f.status === 404 || /resourcenotfound/.test((f.type ?? "").toLowerCase())) {
    return {
      userMessage: GENERIC,
      adminReason: `Polar can't find this plan's product. It may have been archived, or the product IDs in lib/payments/polar-plans.ts belong to another organization or to sandbox. ${said}`,
      retry: null,
    };
  }
  if (f.status === 422 || /validation|unprocessable/.test(text)) {
    if (/discount/.test(fieldText + text)) return { userMessage: GENERIC, adminReason: `Polar refused the discount. ${said}`, retry: "drop-discount" };
    if (/external_customer_id|externalcustomerid|customer_id|customer_metadata|custom_field/.test(fieldText + text)) {
      return {
        userMessage: GENERIC,
        adminReason: `Polar refused to tie this checkout to the Work-ly account (usually a Polar customer that already exists with a different email or id). The account id still travels in the order's metadata, so the purchase is still credited. ${said}`,
        retry: "drop-customer-link",
      };
    }
    if (/customer_email|email/.test(fieldText + text)) {
      return {
        userMessage: GENERIC,
        adminReason: `Polar refused the buyer's email address; checkout will ask for it instead. ${said}`,
        retry: "drop-email",
      };
    }
    return { userMessage: GENERIC, adminReason: `Polar refused the checkout request. ${said}`, retry: null };
  }
  if (f.status == null || f.status >= 500) {
    return {
      userMessage: "Our payment provider didn't answer. Please try again in a minute.",
      adminReason: `Polar was unreachable or had an error on its side. ${said}`,
      retry: null,
    };
  }
  return { userMessage: GENERIC, adminReason: said, retry: null };
}
