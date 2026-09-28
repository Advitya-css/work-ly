import { describe, expect, it } from "vitest";

import { OFFERS, OFFER_KEYS, isOfferKey, offerForProduct, offerProductId, perSeat } from "@/lib/payments/offers";
import {
  groupCodeForOrder,
  isGroupCode,
  normalizeCode,
  parseSeatMetaKey,
  randomGroupCode,
  redeemUrl,
  seatMetaKey,
  seatRowCodes,
  seatRowPattern,
} from "@/lib/payments/seat-codes-core";

describe("offers", () => {
  const env = {
    POLAR_SPRINT_PRODUCT_ID: "prod-sprint",
    POLAR_COACH_PACK_PRODUCT_ID: "prod-coach",
    POLAR_COHORT_PILOT_PRODUCT_ID: " prod-pilot ",
  };

  it("maps a Polar product back to its offer, and nothing else", () => {
    expect(offerForProduct("prod-sprint", env)).toBe("sprint");
    expect(offerForProduct("prod-coach", env)).toBe("coach");
    expect(offerForProduct("prod-pilot", env)).toBe("pilot");
    expect(offerForProduct("some-pro-plan", env)).toBeNull();
    expect(offerForProduct(null, env)).toBeNull();
  });

  it("treats an offer with no product id as not for sale", () => {
    expect(offerProductId("licence", env)).toBeNull();
    expect(offerForProduct("", env)).toBeNull();
  });

  it("prices match the $10,000 plan", () => {
    expect(OFFERS.sprint.price).toBe("$149");
    expect(OFFERS.coach.price).toBe("$250");
    expect(OFFERS.pilot.price).toBe("$750");
    expect(OFFERS.licence.price).toBe("$2,500");
    expect(OFFERS.gift.price).toBe("$49.99");
    expect(perSeat(OFFERS.coach)).toBe("$25 a seat");
    expect(perSeat(OFFERS.licence)).toBe("$25 a seat");
    expect(perSeat(OFFERS.pilot)).toBe("$30 a seat");
    expect(perSeat(OFFERS.gift)).toBeNull();
  });

  it("knows its own keys", () => {
    expect(OFFER_KEYS.every(isOfferKey)).toBe(true);
    expect(isOfferKey("yearly")).toBe(false);
  });
});

describe("seat codes", () => {
  it("gives the same code for the same order, and different codes for different orders", () => {
    const a = groupCodeForOrder("order-1", "TEAM", "secret");
    expect(groupCodeForOrder("order-1", "TEAM", "secret")).toBe(a);
    expect(groupCodeForOrder("order-2", "TEAM", "secret")).not.toBe(a);
    expect(groupCodeForOrder("order-1", "TEAM", "other-secret")).not.toBe(a);
    expect(isGroupCode(a)).toBe(true);
    expect(a).toMatch(/^TEAM-[A-HJKMNP-Z2-9]{8}$/);
  });

  it("recognises group codes but not single-use beta codes or seat rows", () => {
    expect(isGroupCode(randomGroupCode("PASS"))).toBe(true);
    expect(isGroupCode("GIFT-ABCD2345")).toBe(true);
    expect(isGroupCode("BETA-1A2B3C4D")).toBe(false);
    expect(isGroupCode("EARLYBIRD")).toBe(false);
    expect(isGroupCode("TEAM-ABCD2345#001")).toBe(false);
  });

  it("normalises what people type", () => {
    expect(normalizeCode("  team-abcd 2345 ")).toBe("TEAM-ABCD2345");
  });

  it("makes one row per seat under the group's pattern", () => {
    const rows = seatRowCodes("TEAM-ABCD2345", 25);
    expect(rows).toHaveLength(25);
    expect(rows[0]).toBe("TEAM-ABCD2345#001");
    expect(rows.at(-1)).toBe("TEAM-ABCD2345#025");
    expect(seatRowPattern("TEAM-ABCD2345")).toBe("TEAM-ABCD2345#%");
    expect(seatRowCodes("X", 0)).toHaveLength(1);
    expect(seatRowCodes("X", 10_000)).toHaveLength(500);
  });

  it("stores and reads back the label", () => {
    const key = seatMetaKey("COACH-ABCD2345", "Coach trial: Jane!");
    expect(key).toBe("seatcode:COACH-ABCD2345:coach-trial-jane");
    expect(parseSeatMetaKey(key)).toEqual({ group: "COACH-ABCD2345", label: "coach-trial-jane" });
    expect(parseSeatMetaKey("sprint:capacity")).toBeNull();
  });

  it("builds the redeem link", () => {
    expect(redeemUrl("https://work-ly.in/", "GIFT-ABCD2345")).toBe("https://work-ly.in/redeem?code=GIFT-ABCD2345");
  });
});
