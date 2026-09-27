import { describe, expect, it } from "vitest";

import { checkoutPlanCode, dueLifecycleEmail, type LifecycleKind } from "@/lib/lifecycle-core";

const NOW = new Date("2026-09-28T14:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const base = { now: NOW, isPayingPro: false, optedOut: false, sent: new Set<LifecycleKind>(), checkoutOpenedAt: null };

describe("dueLifecycleEmail", () => {
  it("walks a new free account through welcome, gap and the offer", () => {
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(0.5) })).toBe("welcome");
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(2.5) })).toBe("gap");
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(4.5) })).toBeNull();
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(6) })).toBe("founding");
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(9) })).toBeNull();
  });

  it("sends each kind once", () => {
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(0.5), sent: new Set<LifecycleKind>(["welcome"]) })).toBeNull();
  });

  it("puts an unpaid checkout first, after an hour and within a week", () => {
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(3), checkoutOpenedAt: new Date(NOW.getTime() - 2 * 3600_000) })).toBe("checkout");
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(3), checkoutOpenedAt: new Date(NOW.getTime() - 10 * 60_000) })).toBe("gap");
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(20), checkoutOpenedAt: daysAgo(8) })).toBeNull();
  });

  it("never emails paying customers or people who unsubscribed", () => {
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(0.5), isPayingPro: true })).toBeNull();
    expect(dueLifecycleEmail({ ...base, createdAt: daysAgo(0.5), optedOut: true })).toBeNull();
  });

  it("stores the checkout plan as a small code", () => {
    expect(checkoutPlanCode("quarterly")).toBe(2);
    expect(checkoutPlanCode("nonsense")).toBe(0);
  });
});
