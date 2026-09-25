import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn() } }));

import { normalizeOrder, orderBelongsTo } from "@/lib/payments/polar-grant";
import { POLAR_PRODUCT_IDS } from "@/lib/payments/polar-plans";

const USER = { id: "user-1", email: "Buyer@Example.com" };

describe("normalizeOrder", () => {
  it("reads SDK (camelCase) orders", () => {
    const order = normalizeOrder({
      id: "o1",
      status: "paid",
      paid: true,
      productId: POLAR_PRODUCT_IDS.yearly,
      createdAt: new Date("2026-09-25T10:00:00Z"),
      metadata: { user_id: "user-1" },
      customer: { email: "buyer@example.com", externalId: "user-1", metadata: {} },
    });
    expect(order).toMatchObject({ id: "o1", paid: true, productId: POLAR_PRODUCT_IDS.yearly, userIds: ["user-1"] });
    expect(order?.createdAt).toBe("2026-09-25T10:00:00.000Z");
  });

  it("reads raw webhook (snake_case) orders, including a 100% discount order", () => {
    const order = normalizeOrder({
      id: "o2",
      status: "paid",
      paid: true,
      total_amount: 0,
      product_id: POLAR_PRODUCT_IDS.quarterly,
      created_at: "2026-09-25T10:00:00Z",
      customer: { email: "buyer@example.com", external_id: "user-1" },
    });
    expect(order).toMatchObject({ paid: true, productId: POLAR_PRODUCT_IDS.quarterly, userIds: ["user-1"] });
  });

  it("treats a pending order as unpaid", () => {
    expect(normalizeOrder({ id: "o3", status: "pending", paid: false })?.paid).toBe(false);
  });
});

describe("orderBelongsTo", () => {
  it("matches on the attached user id", () => {
    expect(orderBelongsTo(normalizeOrder({ id: "a", metadata: { user_id: "user-1" } })!, USER)).toBe(true);
  });

  it("never grants another account's order, even with the same email", () => {
    const order = normalizeOrder({ id: "b", metadata: { user_id: "user-2" }, customer: { email: "buyer@example.com" } })!;
    expect(orderBelongsTo(order, USER)).toBe(false);
  });

  it("falls back to the email when no id was attached", () => {
    expect(orderBelongsTo(normalizeOrder({ id: "c", customer: { email: "buyer@example.com" } })!, USER)).toBe(true);
    expect(orderBelongsTo(normalizeOrder({ id: "d", customer: { email: "other@example.com" } })!, USER)).toBe(false);
  });
});
