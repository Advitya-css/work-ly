import { describe, expect, it } from "vitest";

import {
  discountedPrice,
  foundingFromDiscount,
  foundingPriceLine,
  foundingSummary,
} from "@/lib/payments/founding-core";
import { GUARANTEE, RECOMMENDED_BADGE } from "@/lib/business";

const NOW = new Date("2026-09-27T12:00:00Z");
const base = {
  id: "disc_1",
  basisPoints: 4000,
  duration: "once",
  startsAt: null,
  endsAt: new Date("2026-10-27T00:00:00Z"),
  maxRedemptions: 50,
  redemptionsCount: 27,
};

describe("foundingFromDiscount", () => {
  it("reads a live 40%-off discount with spots and a deadline", () => {
    expect(foundingFromDiscount(base, NOW)).toMatchObject({ percentOff: 40, spotsTotal: 50, spotsLeft: 23, duration: "once" });
  });

  it("shows no offer once it has ended, run out, not started, or isn't a percentage", () => {
    expect(foundingFromDiscount({ ...base, endsAt: new Date("2026-09-01") }, NOW)).toBeNull();
    expect(foundingFromDiscount({ ...base, redemptionsCount: 50 }, NOW)).toBeNull();
    expect(foundingFromDiscount({ ...base, startsAt: new Date("2026-10-01") }, NOW)).toBeNull();
    expect(foundingFromDiscount({ ...base, basisPoints: undefined }, NOW)).toBeNull();
    expect(foundingFromDiscount(null, NOW)).toBeNull();
  });
});

describe("founding prices", () => {
  const offer = foundingFromDiscount(base, NOW)!;
  it("never overstates the discount", () => {
    expect(discountedPrice(149.99, 40)).toBe("$89.99");
    expect(discountedPrice(49.99, 40)).toBe("$29.99");
    expect(discountedPrice(19.99, 40)).toBe("$11.99");
  });

  it("says a one-off discount on Monthly covers the first month only", () => {
    expect(foundingPriceLine({ priceUsd: 19.99, renews: true }, offer)).toBe("Founding price: $11.99 for your first month");
    expect(foundingPriceLine({ priceUsd: 149.99, renews: false }, offer)).toBe("Founding price: $89.99");
  });

  it("summarises spots and deadline", () => {
    expect(foundingSummary(offer)).toBe("40% off for founding members · 23 of 50 spots left · ends 27 Oct");
  });
});

describe("advertised guarantee", () => {
  it("always carries its light-use condition", () => {
    expect(GUARANTEE.sentence).toMatch(/fewer than 10 Pro tools/);
    expect(GUARANTEE.feature).toMatch(/under 10 Pro tools/);
    expect(RECOMMENDED_BADGE).not.toMatch(/popular/i);
  });
});
