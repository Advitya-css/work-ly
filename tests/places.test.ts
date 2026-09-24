import { describe, expect, it } from "vitest";

import { placeMatches, resolvePlace } from "@/lib/places";
import { matchesLocationPreference } from "@/lib/jobs/location-match";

describe("placeMatches", () => {
  it("treats old and new city names as the same city", () => {
    expect(placeMatches("Bangalore, India", "Bengaluru, Karnataka, India")).toBe(true);
    expect(placeMatches("Bengaluru, India", "Bangalore")).toBe(true);
    expect(placeMatches("Gurgaon", "Gurugram, Haryana")).toBe(true);
    expect(placeMatches("Bombay", "Mumbai, Maharashtra")).toBe(true);
  });

  it("does not match a different city just because the country is shared", () => {
    expect(placeMatches("Bangalore, India", "Mumbai, India")).toBe(false);
    expect(placeMatches("Bengaluru", "Hyderabad, Telangana, India")).toBe(false);
  });

  it("matches within a metro area", () => {
    expect(placeMatches("Delhi NCR", "Noida, Uttar Pradesh")).toBe(true);
    expect(placeMatches("New Delhi, India", "Gurugram")).toBe(true);
    expect(placeMatches("San Francisco", "Palo Alto, CA")).toBe(true);
  });

  it("lets a country preference match any city in it", () => {
    expect(placeMatches("India", "Pune, Maharashtra")).toBe(true);
    expect(placeMatches("India", "London, UK")).toBe(false);
  });

  it("accepts a country-only job for a city preference in that country", () => {
    expect(placeMatches("Bengaluru, India", "India")).toBe(true);
    expect(placeMatches("Bengaluru, India", "United States")).toBe(false);
  });

  it("does not read the word 'in' as India", () => {
    expect(resolvePlace("Office in London").countries.has("india")).toBe(false);
    expect(resolvePlace("Austin, US").countries.has("united states")).toBe(true);
  });

  it("does not read New South Wales as the UK", () => {
    expect(resolvePlace("Sydney, New South Wales").countries.has("united kingdom")).toBe(false);
  });

  it("falls back to careful text matching for unknown places", () => {
    expect(placeMatches("Tallinn, Estonia", "Tallinn")).toBe(true);
    expect(placeMatches("Tallinn, Estonia", "Riga, Latvia")).toBe(false);
  });
});

describe("matchesLocationPreference", () => {
  const pref = { homeLocation: "Bengaluru, India", preferredLocations: [], openToRemote: true };
  it("uses the alias-aware match", () => {
    expect(matchesLocationPreference("Bangalore Urban, Karnataka", "ONSITE", pref)).toBe(true);
    expect(matchesLocationPreference("Chennai, India", "ONSITE", pref)).toBe(false);
  });
  it("lets placeless remote listings through for remote-open users", () => {
    expect(matchesLocationPreference("Remote", null, pref)).toBe(true);
    expect(matchesLocationPreference("Remote", null, { ...pref, openToRemote: false })).toBe(false);
  });
});

describe("unknown city with a known country", () => {
  it("matches that city or a country-only job, not every city in the country", () => {
    expect(placeMatches("Surat, India", "Surat, Gujarat")).toBe(true);
    expect(placeMatches("Surat, India", "India")).toBe(true);
    expect(placeMatches("Surat, India", "Mumbai, India")).toBe(false);
  });
});

import { remoteAllowsCountry } from "@/lib/places";

describe("remoteAllowsCountry", () => {
  it("rejects remote roles restricted to other regions", () => {
    expect(remoteAllowsCountry("USA, Canada, Argentina, Mexico, Peru", null, ["India"])).toBe(false);
    expect(remoteAllowsCountry("Northern America, LATAM, Europe", null, ["India"])).toBe(false);
    expect(remoteAllowsCountry("USA", null, ["Bengaluru, India"])).toBe(false);
  });
  it("accepts worldwide and regions that include the user", () => {
    expect(remoteAllowsCountry("Worldwide", null, ["India"])).toBe(true);
    expect(remoteAllowsCountry("Northern America, LATAM, Europe, APAC", null, ["India"])).toBe(true);
    expect(remoteAllowsCountry("Remote - India", null, ["India"])).toBe(true);
  });
  it("is unknown when nothing readable is stated", () => {
    expect(remoteAllowsCountry("Remote", null, ["India"])).toBeNull();
    expect(remoteAllowsCountry("USA", null, [])).toBeNull();
  });
});
