import { beforeAll, describe, expect, it, vi } from "vitest";

import { checkoutAdvice, readCheckoutError } from "@/lib/payments/checkout-errors";
import { openPolarCheckout, type CheckoutRequest } from "@/lib/payments/checkout";

/** Shaped like the Polar SDK's errors: a status and the raw JSON body. */
function polarError(statusCode: number, body: unknown) {
  const e = new Error(`API error occurred: Status ${statusCode}`) as Error & { statusCode: number; body: string };
  e.statusCode = statusCode;
  e.body = typeof body === "string" ? body : JSON.stringify(body);
  return e;
}

const EXPIRED = polarError(401, { error: "invalid_token", error_description: "The access token provided is expired, revoked, malformed, or invalid." });
const NOT_READY = polarError(403, { error: "OrganizationNotReadyForPayments", detail: "Organization is not ready to accept payments" });
const NO_SCOPE = polarError(403, { error: "NotPermitted", detail: "Insufficient scope" });
const NO_PRODUCT = polarError(404, { error: "ResourceNotFound", detail: "Product not found" });
const CUSTOMER = polarError(422, {
  error: "PolarRequestValidationError",
  detail: [{ loc: ["body", "external_customer_id"], msg: "A customer with this external ID already exists with a different email.", type: "value_error" }],
});
const EMAIL = polarError(422, { detail: [{ loc: ["body", "customer_email"], msg: "value is not a valid email address", type: "value_error" }] });
const DISCOUNT = polarError(422, { detail: [{ loc: ["body", "discount_id"], msg: "Discount is not applicable to this product", type: "value_error" }] });
const VAGUE_422 = polarError(422, { detail: [{ loc: ["body"], msg: "Something about the request", type: "value_error" }] });
const DOWN = polarError(502, "<html>Bad gateway</html>");

describe("reading Polar's answer", () => {
  it("pulls out the status, the error name, the message and the fields", () => {
    const f = readCheckoutError(CUSTOMER);
    expect(f.status).toBe(422);
    expect(f.type).toBe("PolarRequestValidationError");
    expect(f.fields).toContain("external_customer_id");
    expect(f.detail).toMatch(/different email/);
    expect(readCheckoutError(DOWN)).toMatchObject({ status: 502, detail: "<html>Bad gateway</html>" });
    expect(readCheckoutError(new TypeError("fetch failed"))).toMatchObject({ status: null, type: "TypeError", detail: "fetch failed" });
    expect(readCheckoutError(undefined)).toMatchObject({ status: null, detail: "" });
  });

  it("explains each failure to the founder, and never shows the buyer Polar's text", () => {
    const cases: [Error, RegExp, string | null][] = [
      [EXPIRED, /access token.*expired or been revoked/, null],
      [NOT_READY, /can't take payments/, null],
      [NO_SCOPE, /isn't allowed to create checkouts/, null],
      [NO_PRODUCT, /can't find this plan's product/, null],
      [CUSTOMER, /tie this checkout to the Work-ly account/, "drop-customer-link"],
      [EMAIL, /buyer's email/, "drop-email"],
      [DISCOUNT, /refused the discount/, "drop-discount"],
      [DOWN, /unreachable or had an error/, null],
    ];
    for (const [err, reason, retry] of cases) {
      const a = checkoutAdvice(readCheckoutError(err));
      expect(a.adminReason).toMatch(reason);
      expect(a.retry).toBe(retry);
      expect(a.userMessage).not.toMatch(/polar said|invalid_token|external|discount_id|scope/i);
    }
  });
});

describe("openPolarCheckout", () => {
  const REQ: CheckoutRequest = {
    productId: "prod-monthly",
    email: "buyer@workly-test.dev",
    userId: "user-1",
    metadata: { user_id: "user-1" },
    successUrl: "https://work-ly.in/settings?checkout_id={CHECKOUT_ID}",
    discountId: "disc-founding",
  };
  beforeAll(() => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";
  });
  function fake(...answers: (Error | "ok")[]) {
    const calls: Record<string, unknown>[] = [];
    const create = vi.fn(async (body: Record<string, unknown>) => {
      calls.push(body);
      const a = answers[calls.length - 1] ?? "ok";
      if (a === "ok") return { url: `https://polar.sh/checkout/${calls.length}` };
      throw a;
    });
    return { client: { checkouts: { create } } as never, calls };
  }

  it("opens first time with everything on it", async () => {
    const { client, calls } = fake("ok");
    const out = await openPolarCheckout(REQ, client);
    expect(out).toEqual({ ok: true, url: "https://polar.sh/checkout/1", dropped: [] });
    expect(calls[0]).toMatchObject({ discountId: "disc-founding", externalCustomerId: "user-1", customerEmail: REQ.email, metadata: { user_id: "user-1" } });
  });

  it("a customer clash: tries again without the customer link, keeping the discount and the account id", async () => {
    const { client, calls } = fake(CUSTOMER, "ok");
    const out = await openPolarCheckout(REQ, client);
    expect(out).toMatchObject({ ok: true, dropped: ["drop-customer-link"] });
    expect(calls[1]).not.toHaveProperty("externalCustomerId");
    expect(calls[1]).not.toHaveProperty("customFieldData");
    expect(calls[1]).toMatchObject({ discountId: "disc-founding", metadata: { user_id: "user-1" }, customerEmail: REQ.email });
  });

  it("a vague refusal: drops the discount, then the customer link, then the email, and stops", async () => {
    const { client, calls } = fake(VAGUE_422, VAGUE_422, VAGUE_422, VAGUE_422);
    const out = await openPolarCheckout(REQ, client);
    expect(out.ok).toBe(false);
    expect(calls).toHaveLength(4);
    expect(calls[3]).toEqual({ products: ["prod-monthly"], metadata: { user_id: "user-1" }, successUrl: REQ.successUrl });
  });

  it("a refused discount still sells at full price", async () => {
    const { client, calls } = fake(DISCOUNT, "ok");
    const out = await openPolarCheckout(REQ, client);
    expect(out).toMatchObject({ ok: true, dropped: ["drop-discount"] });
    expect(calls[1]).not.toHaveProperty("discountId");
  });

  it("a deleted discount (404) is dropped before giving up", async () => {
    const { client } = fake(NO_PRODUCT, "ok");
    expect(await openPolarCheckout(REQ, client)).toMatchObject({ ok: true, dropped: ["drop-discount"] });
    const noDiscount = fake(NO_PRODUCT, "ok");
    const out = await openPolarCheckout({ ...REQ, discountId: null }, noDiscount.client);
    expect(out.ok).toBe(false);
    expect(noDiscount.calls).toHaveLength(1);
  });

  it("stops at once when retrying can't help, with the reason", async () => {
    for (const err of [EXPIRED, NOT_READY, NO_SCOPE, DOWN]) {
      const { client, calls } = fake(err, "ok");
      const out = await openPolarCheckout(REQ, client);
      expect(out.ok).toBe(false);
      expect(calls).toHaveLength(1);
    }
  });

  it("no token on the deployment: says so without calling Polar", async () => {
    const saved = process.env.POLAR_ACCESS_TOKEN;
    delete process.env.POLAR_ACCESS_TOKEN;
    const { client, calls } = fake("ok");
    const out = await openPolarCheckout(REQ, client);
    process.env.POLAR_ACCESS_TOKEN = saved;
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.advice.adminReason).toMatch(/POLAR_ACCESS_TOKEN isn't set/);
    expect(calls).toHaveLength(0);
  });
});
