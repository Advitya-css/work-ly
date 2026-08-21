import { describe, it, expect } from "vitest";

import {
  matchesLocationPreference,
  locationCandidates,
  hasLocationPreference,
  type LocationPreference,
} from "@/lib/jobs/location-match";

function pref(overrides: Partial<LocationPreference> = {}): LocationPreference {
  return { homeLocation: null, preferredLocations: [], openToRemote: true, ...overrides };
}

describe("locationCandidates", () => {
  it("combines home location and willing-to-work cities, deduped", () => {
    expect(locationCandidates("London", ["London", "Manchester"])).toEqual(["London", "Manchester"]);
  });

  it("drops blanks and handles a missing home location", () => {
    expect(locationCandidates(null, ["Berlin", "  ", ""])).toEqual(["Berlin"]);
  });

  it("returns an empty list when nothing is set", () => {
    expect(locationCandidates(null, [])).toEqual([]);
  });
});

describe("hasLocationPreference", () => {
  it("is false when nothing is set and remote is acceptable", () => {
    expect(hasLocationPreference(pref())).toBe(false);
  });

  it("is true once a place is named", () => {
    expect(hasLocationPreference(pref({ homeLocation: "London" }))).toBe(true);
  });

  it("is true when remote has been ruled out, even with no places named", () => {
    // Ruling remote out is itself a preference worth filtering on.
    expect(hasLocationPreference(pref({ openToRemote: false }))).toBe(true);
  });
});

describe("matchesLocationPreference", () => {
  it("matches a remote role when the user is open to remote", () => {
    expect(
      matchesLocationPreference("Anywhere", "REMOTE", pref({ homeLocation: "London" })),
    ).toBe(true);
  });

  it("excludes a remote role when the user has turned remote off", () => {
    // The old version always let remote through, which quietly ignored
    // someone who had explicitly said they did not want it.
    expect(
      matchesLocationPreference("Anywhere", "REMOTE", pref({ homeLocation: "London", openToRemote: false })),
    ).toBe(false);
  });

  it("matches when nothing has been set - nothing to filter against", () => {
    expect(matchesLocationPreference("Tokyo", "ONSITE", pref())).toBe(true);
  });

  it("gives the benefit of the doubt to a job with no stated location", () => {
    expect(matchesLocationPreference(null, "ONSITE", pref({ homeLocation: "London" }))).toBe(true);
  });

  it("matches a job location that contains a candidate city", () => {
    expect(matchesLocationPreference("London, UK", "HYBRID", pref({ homeLocation: "London" }))).toBe(true);
  });

  it("matches a candidate that contains the job's shorter location string", () => {
    expect(
      matchesLocationPreference("Austin", "ONSITE", pref({ preferredLocations: ["Austin, TX"] })),
    ).toBe(true);
  });

  it("matches against the willing-to-work list, not just home", () => {
    expect(
      matchesLocationPreference(
        "Berlin, Germany",
        "ONSITE",
        pref({ homeLocation: "London", preferredLocations: ["Berlin"] }),
      ),
    ).toBe(true);
  });

  it("excludes a stated location that matches none of the candidates", () => {
    expect(
      matchesLocationPreference(
        "Berlin, Germany",
        "ONSITE",
        pref({ homeLocation: "London", preferredLocations: ["Manchester"] }),
      ),
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(matchesLocationPreference("LONDON", "ONSITE", pref({ homeLocation: "london" }))).toBe(true);
  });
});
