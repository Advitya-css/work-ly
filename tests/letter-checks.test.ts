import { describe, expect, it } from "vitest";

import { checkLetter } from "@/lib/kit/letter-checks";

const ok = (letter: string, unverified: string[] = []) =>
  Object.fromEntries(checkLetter(letter, { maxWords: 260, unverified }).map((c) => [c.label.split(" (")[0], c.ok]));

describe("checkLetter", () => {
  it("passes a letter that opens with the team's need", () => {
    const r = ok("Dear Hiring Team,\n\nSwiggy's delivery team needs metrics people trust. At QuickBite I built 40+ dbt models.\n\nBest regards,\nPriya");
    expect(Object.values(r).every(Boolean)).toBe(true);
  });

  it("flags a self-centred opener and stock phrases", () => {
    const r = ok("Dear Hiring Team,\n\nI am writing to apply. I am a passionate, results-driven analyst.");
    expect(r["Opens with what they need, not with you"]).toBe(false);
    expect(r["No stock phrases"]).toBe(false);
  });

  it("flags numbers that aren't on the profile", () => {
    expect(ok("Dear team,\n\nYour team needs speed.", ["45%"])["Every number is on your profile"]).toBe(false);
  });
});
