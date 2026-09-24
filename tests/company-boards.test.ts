import { beforeEach, describe, expect, it, vi } from "vitest";

// A plain function rather than vi.fn(): a vi.fn whose async implementation
// throws is reported by vitest as a test error even when the code under
// test catches it.
let impl: () => Promise<string> = async () => "{}";
let calls = 0;
const fetchMock = {
  mockResolvedValue: (v: string) => { impl = async () => v; },
  mockImplementation: (f: () => Promise<string>) => { impl = f; },
  mockClear: () => { calls = 0; },
};
vi.mock("@/lib/discovery/sources/base", async (orig) => {
  const actual = await orig<typeof import("@/lib/discovery/sources/base")>();
  return { ...actual, fetchWithGuards: () => { calls++; return impl(); } };
});

import { ashbySource, greenhouseSource, leverSource } from "@/lib/discovery/sources/company-career";
import { companyBoardsFor, RETIRED_BOARDS } from "@/lib/discovery/company-boards";

const now = new Date().toISOString();

describe("Ashby adapter", () => {
  beforeEach(() => fetchMock.mockClear());

  it("reads the documented field names and marks remote roles", async () => {
    fetchMock.mockResolvedValue(
      JSON.stringify({
        jobs: [
          { id: "1", title: "Analytics Engineer", location: "Bengaluru", department: "Data", isRemote: false, publishedAt: now, jobUrl: "https://x/1", descriptionPlain: "dbt" },
          { id: "2", title: "Data Analyst", location: "Remote - India", isRemote: true, publishedAt: now, jobUrl: "https://x/2" },
          { id: "3", title: "Account Executive", location: "Mumbai", publishedAt: now, jobUrl: "https://x/3" },
          { id: "4", title: "Data Engineer", location: "Pune", isListed: false, publishedAt: now, jobUrl: "https://x/4" },
        ],
      }),
    );
    const out = await ashbySource.ingest({
      query: "Analytics Engineer",
      config: { boardToken: "sarvam-" + Math.random(), companyName: "Sarvam AI" },
      limit: 10,
      homeLocation: "Bengaluru, India",
    });
    expect(out.map((o) => o.title).sort()).toEqual(["Analytics Engineer", "Data Analyst"]);
    const ae = out.find((o) => o.title === "Analytics Engineer")!;
    expect(ae.location).toBe("Bengaluru");
    expect(ae.company).toBe("Sarvam AI");
    expect(ae.industry).toBe("Data");
    expect(out.find((o) => o.title === "Data Analyst")!.workModeRaw).toBe("Remote");
  });

  it("surfaces errors instead of reporting an empty healthy board", async () => {
    fetchMock.mockImplementation(async () => { throw new Error("Source returned HTTP 404"); });
    let caught: unknown = null;
    try {
      await ashbySource.ingest({ query: "Analyst", config: { boardToken: "nope-" + Math.random() }, limit: 5 });
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).toContain("404");
  });
});

describe("Greenhouse and Lever adapters", () => {
  beforeEach(() => fetchMock.mockClear());

  it("puts the user's city first and keeps only in-field roles before the limit", async () => {
    fetchMock.mockResolvedValue(
      JSON.stringify({
        jobs: [
          { id: 1, title: "Sales Manager", location: { name: "Bengaluru" }, updated_at: now },
          { id: 2, title: "Data Analyst", location: { name: "San Francisco" }, updated_at: now },
          { id: 3, title: "Senior Data Analyst", location: { name: "Bengaluru, Karnataka" }, updated_at: now },
        ],
      }),
    );
    const out = await greenhouseSource.ingest({
      query: "Data Analyst",
      config: { boardToken: "razorpaysoftwareprivatelimited-" + Math.random() },
      limit: 1,
      homeLocation: "Bangalore, India",
    });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Senior Data Analyst");
  });

  it("fetches a board once per run even when several search terms ask for it", async () => {
    fetchMock.mockResolvedValue(JSON.stringify([{ id: "a", text: "Data Analyst", categories: { location: "Bengaluru" }, createdAt: Date.now(), hostedUrl: "https://l/a" }]));
    const config = { boardToken: "cred-" + Math.random(), companyName: "CRED" };
    await Promise.all([
      leverSource.ingest({ query: "Data Analyst", config, limit: 5 }),
      leverSource.ingest({ query: "Analytics Engineer", config, limit: 5 }),
    ]);
    expect(calls).toBe(1);
  });

  it("returns every role for a company the user searched by name", async () => {
    fetchMock.mockResolvedValue(JSON.stringify([{ id: "a", text: "Chef", categories: { location: "Mumbai" }, createdAt: Date.now() }]));
    const out = await leverSource.ingest({ query: "stripe", config: { boardToken: "x-" + Math.random(), allRoles: true }, limit: 5 });
    expect(out).toHaveLength(1);
  });
});

describe("company boards by country", () => {
  it("gives India users (and users with no location yet) the India boards", () => {
    expect(companyBoardsFor(["Bengaluru, India"]).length).toBeGreaterThan(10);
    expect(companyBoardsFor([]).length).toBeGreaterThan(10);
  });
  it("gives no India boards to someone only in London", () => {
    expect(companyBoardsFor(["London, UK"])).toHaveLength(0);
  });
  it("retires the handles that were never real boards", () => {
    expect(RETIRED_BOARDS.map((b) => b.boardToken)).toEqual(expect.arrayContaining(["swiggy", "atlassian", "postman", "phonepe"]));
    expect(companyBoardsFor(["India"]).some((b) => b.boardToken === "swiggy")).toBe(false);
  });
});
