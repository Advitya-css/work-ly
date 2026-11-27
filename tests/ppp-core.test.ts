import { describe, expect, it } from "vitest";

import { countryCodeForPlace, isPlaceCovered } from "@/lib/places";
import {
  countryDisplayName,
  formatDisplayPrice,
  isCoveredCountryCode,
  isPppCountry,
  pickBestDiscount,
} from "@/lib/payments/ppp-core";

describe("country coverage", () => {
  it("recognizes all 24 covered countries and cities within them", () => {
    expect(isPlaceCovered("Bengaluru, India").covered).toBe(true);
    expect(isPlaceCovered("Surat, India").covered).toBe(true);
    expect(isPlaceCovered("New York, NY").covered).toBe(true);
    expect(isPlaceCovered("Sao Paulo, Brazil").covered).toBe(true);
    expect(isCoveredCountryCode("IN")).toBe(true);
    expect(isCoveredCountryCode("US")).toBe(true);
    expect(isCoveredCountryCode("BR")).toBe(true);
  });

  it("flags uncovered countries and cities as not covered yet", () => {
    expect(isPlaceCovered("Tokyo, Japan").covered).toBe(false);
    expect(isPlaceCovered("Lagos, Nigeria").covered).toBe(false);
    expect(isCoveredCountryCode("JP")).toBe(false);
    expect(isCoveredCountryCode("NG")).toBe(false);
    expect(countryDisplayName("JP")).toBe("Japan");
  });
});

describe("regional PPP", () => {
  it("applies PPP to emerging covered markets and excludes high-income or uncovered markets", () => {
    expect(isPppCountry("IN")).toBe(true);
    expect(isPppCountry("BR")).toBe(true);
    expect(isPppCountry("US")).toBe(false);
    expect(isPppCountry("GB")).toBe(false);
    expect(isPppCountry("JP")).toBe(false);
    expect(isPppCountry("SG", "IN,SG")).toBe(true);
  });

  it("picks sale on matching plan first, otherwise the larger discount between founding and PPP", () => {
    const sale = { plan: "yearly", discountId: "disc_sale" };
    const founding = { discountId: "disc_founding", percentOff: 50 };
    const ppp = { discountId: "disc_ppp", percentOff: 60 };

    expect(pickBestDiscount({ plan: "yearly", sale, founding, ppp })).toEqual({ discountId: "disc_sale", kind: "sale" });
    expect(pickBestDiscount({ plan: "quarterly", sale, founding, ppp })).toEqual({ discountId: "disc_ppp", kind: "ppp" });
    expect(
      pickBestDiscount({ plan: "quarterly", sale: null, founding: { discountId: "disc_founding", percentOff: 70 }, ppp }),
    ).toEqual({ discountId: "disc_founding", kind: "founding" });
  });

  it("formats local currency display from place and country code", () => {
    expect(countryCodeForPlace("Delhi, India")).toBe("IN");
    expect(countryCodeForPlace("London, UK")).toBe("GB");
    const inPrice = formatDisplayPrice(49.99, 45, "IN");
    expect(inPrice.isLocalCurrency).toBe(true);
    expect(inPrice.currencyCode).toBe("INR");
    expect(inPrice.usd).toBe("$27.49");
    expect(inPrice.primary).toMatch(/^~₹/);
  });
});
