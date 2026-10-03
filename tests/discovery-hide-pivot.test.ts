import { describe, expect, it } from "vitest";

import { isHiddenRole, roleKey } from "@/lib/discovery/hidden-roles-core";
import { entryVariant, isCareerChange } from "@/lib/discovery/pivot-core";

describe("roleKey / isHiddenRole", () => {
  it("treats the same role from another board or a repost as the same role", () => {
    expect(roleKey("Acme, Inc.", "Senior Data Analyst")).toBe(roleKey("Acme", "Senior Data Analyst!"));
    const hidden = new Set([roleKey("Grab", "Product Designer")!]);
    expect(isHiddenRole({ company: "Grab Holdings", title: "Product Designer" }, hidden)).toBe(true);
    expect(isHiddenRole({ company: "Grab", title: "Senior Product Designer" }, hidden)).toBe(false);
    expect(isHiddenRole({ company: "Shopee", title: "Product Designer" }, hidden)).toBe(false);
  });

  it("never hides on a title alone", () => {
    expect(roleKey(null, "Product Designer")).toBeNull();
    expect(isHiddenRole({ company: null, title: "Product Designer" }, new Set(["|product designer"]))).toBe(false);
  });
});

describe("isCareerChange", () => {
  it("spots a move into a different field", () => {
    expect(isCareerChange("UX Designer", ["Marketing Manager", "Brand Executive"])).toBe(true);
    expect(isCareerChange("Data Analyst", ["Primary School Teacher"])).toBe(true);
  });

  it("is not a career change when the target is a step in the same field", () => {
    expect(isCareerChange("Analytics Engineer", ["Senior Data Analyst"])).toBe(false);
    expect(isCareerChange("Product Manager", ["Associate Product Manager"])).toBe(false);
  });

  it("needs both a target and some history", () => {
    expect(isCareerChange(null, ["Marketing Manager"])).toBe(false);
    expect(isCareerChange("UX Designer", [])).toBe(false);
    expect(isCareerChange("Senior Manager", ["Teacher"])).toBe(false);
  });

  it("suggests the entry level of the new role", () => {
    expect(entryVariant("UX Designer")).toBe("Junior UX Designer");
    expect(entryVariant("Associate Product Manager")).toBeNull();
  });
});
