import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jobPostingSchemaSource } from "@/lib/discovery/sources/company-career";
import { arbeitnowSource, jobicySource } from "@/lib/discovery/sources/keyless-boards";
import { apiProviderSource } from "@/lib/discovery/sources/api-provider";

// fetchWithGuards resolves the target host via real DNS before ever
// reaching `fetch` (lib/net/ssrf-guard.ts) - that's the point of it, it's
// what makes the SSRF check real - but it means these tests' `.example`
// hostnames (deliberately non-resolvable, RFC 2606) need DNS itself
// stubbed too, not just fetch, or every one of them fails on a lookup
// error before the mocked fetch response is ever reached. A fixed public
// unicast address stands in for "wherever this would really resolve" -
// the adapters under test don't care what the address is, only what the
// mocked fetch returns for it.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

/**
 * These two adapters are the new legally-clean sources: schema.org
 * JobPosting data any company can publish on its own careers page, and
 * Arbeitnow's open keyless board API. Both need to survive the shapes real
 * pages and APIs actually produce - multiple JobPosting blocks, a
 * @graph-wrapped block, malformed JSON-LD sitting next to good JSON-LD - and
 * neither should ever need credentials to run.
 */

// A real Response (not a hand-rolled {ok, status, text} stub): base.ts's
// fetchWithGuards streams the body via response.body.getReader() to enforce
// its size cap without buffering first (see its docstring), and a stub
// missing `.body` entirely used to silently read back as an empty string
// instead of the mocked content. The platform Response constructor gives a
// real ReadableStream for free.
function textResponse(body: string) {
  return new Response(body, { status: 200 });
}

describe("jobPostingSchemaSource", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is only configured once a careers URL is supplied", () => {
    expect(jobPostingSchemaSource.isConfigured({})).toBe(false);
    expect(jobPostingSchemaSource.isConfigured({ careersUrl: "not-a-url" })).toBe(false);
    expect(jobPostingSchemaSource.isConfigured({ careersUrl: "https://acme.example/careers" })).toBe(true);
  });

  it("extracts a single JobPosting block", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Backend Engineer",
          "description": "<p>Build things.</p>",
          "datePosted": "2026-07-01",
          "hiringOrganization": { "name": "Acme Co" },
          "jobLocation": { "address": { "addressLocality": "Austin", "addressRegion": "TX", "addressCountry": "US" } },
          "employmentType": "FULL_TIME",
          "baseSalary": { "currency": "USD", "value": { "minValue": 120000, "maxValue": 150000 } }
        }
        </script>
      </head></html>
    `;
    fetchMock.mockResolvedValueOnce(textResponse(html));

    const results = await jobPostingSchemaSource.ingest({
      config: { careersUrl: "https://acme.example/careers/backend-engineer" },
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Backend Engineer",
      company: "Acme Co",
      location: "Austin, TX",
      country: "US",
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: "USD",
      url: "https://acme.example/careers/backend-engineer",
    });
    expect(results[0].description).toContain("Build things.");
    expect(results[0].description).not.toContain("<p>");
  });

  it("extracts every JobPosting from a @graph-wrapped block on a listing page", async () => {
    const html = `<script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "JobPosting", "title": "Role A", "hiringOrganization": { "name": "Acme" } },
          { "@type": "WebPage", "name": "Careers" },
          { "@type": "JobPosting", "title": "Role B", "hiringOrganization": { "name": "Acme" } }
        ]
      }
    </script>`;
    fetchMock.mockResolvedValueOnce(textResponse(html));

    const results = await jobPostingSchemaSource.ingest({
      config: { careersUrl: "https://acme.example/careers" },
      limit: 10,
    });

    expect(results.map((r) => r.title)).toEqual(["Role A", "Role B"]);
  });

  it("skips malformed JSON-LD instead of throwing, and still reads the good block", async () => {
    const html = `
      <script type="application/ld+json">{ this is not valid json </script>
      <script type="application/ld+json">
        { "@type": "JobPosting", "title": "Recovered Role", "hiringOrganization": { "name": "Acme" } }
      </script>
    `;
    fetchMock.mockResolvedValueOnce(textResponse(html));

    const results = await jobPostingSchemaSource.ingest({
      config: { careersUrl: "https://acme.example/careers" },
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Recovered Role");
  });

  it("returns nothing rather than crashing when a page has no JobPosting data at all", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("<html><body>No jobs here</body></html>"));

    const results = await jobPostingSchemaSource.ingest({
      config: { careersUrl: "https://acme.example/about" },
      limit: 10,
    });

    expect(results).toEqual([]);
  });
});

describe("arbeitnowSource", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("needs no configuration at all", () => {
    expect(arbeitnowSource.isConfigured({})).toBe(true);
  });

  it("normalizes listings and marks remote roles by location", async () => {
    fetchMock.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          data: [
            {
              slug: "senior-dev",
              company_name: "Remote Co",
              title: "Senior Developer",
              description: "<p>Ship code.</p>",
              remote: true,
              url: "https://arbeitnow.com/jobs/remote-co/senior-dev",
              tags: ["Engineering"],
              job_types: ["Full-time"],
              created_at: 1700000000,
            },
            {
              slug: "office-role",
              company_name: "Office Co",
              title: "Office Analyst",
              remote: false,
              location: "Berlin, Germany",
              tags: ["Finance"],
              job_types: ["Part-time"],
            },
          ],
        }),
      ),
    );

    const results = await arbeitnowSource.ingest({ config: {}, limit: 10 });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ title: "Senior Developer", location: "Remote", company: "Remote Co" });
    expect(results[1]).toMatchObject({ title: "Office Analyst", location: "Berlin, Germany" });
  });

  it("filters by the discovery query when one is supplied", async () => {
    fetchMock.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          data: [
            { slug: "a", title: "Frontend Engineer", company_name: "Acme", tags: ["React"] },
            { slug: "b", title: "Warehouse Associate", company_name: "Acme", tags: ["Logistics"] },
          ],
        }),
      ),
    );

    const results = await arbeitnowSource.ingest({ config: {}, limit: 10, query: "frontend" });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Frontend Engineer");
  });
});

describe("jobicySource", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Regression test: Jobicy's real API returns jobIndustry (and sometimes
  // jobType) as an array of strings, not a single string. The adapter used
  // to call `.toLowerCase()` directly on whatever jobIndustry was, which
  // crashed with a TypeError on every keyword search the moment a listing
  // had an array there - silently zeroing out one of the four default,
  // zero-config sources on the single most common usage (a search with a
  // query typed in), with no error surfaced to the user beyond the source
  // quietly showing zero results.
  it("does not crash on keyword search when jobIndustry/jobType are arrays", async () => {
    fetchMock.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          jobs: [
            {
              id: 1,
              jobTitle: "Marketing Data Analyst",
              companyName: "Acme Remote",
              jobGeo: "Worldwide",
              jobIndustry: ["Marketing", "Data & Analytics"],
              jobType: ["full-time"],
              url: "https://jobicy.com/jobs/1",
            },
            {
              id: 2,
              jobTitle: "Warehouse Lead",
              companyName: "Other Co",
              jobGeo: "Worldwide",
              jobIndustry: ["Logistics"],
              jobType: ["part-time"],
              url: "https://jobicy.com/jobs/2",
            },
          ],
        }),
      ),
    );

    let results: Awaited<ReturnType<typeof jobicySource.ingest>> = [];
    await expect(
      (async () => {
        results = await jobicySource.ingest({ config: {}, limit: 10, query: "analytics" });
      })(),
    ).resolves.not.toThrow();

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Marketing Data Analyst");
    // The array-shaped fields should still make it through to the raw
    // listing as usable text, not silently become null.
    expect(results[0].industry).toBe("Marketing Data & Analytics");
    expect(results[0].employmentTypeRaw).toBe("full-time");
  });

  it("still works when jobIndustry/jobType are plain strings", async () => {
    fetchMock.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          jobs: [
            {
              id: 3,
              jobTitle: "Product Designer",
              companyName: "Acme",
              jobGeo: "Worldwide",
              jobIndustry: "Design",
              jobType: "full-time",
              url: "https://jobicy.com/jobs/3",
            },
          ],
        }),
      ),
    );

    const results = await jobicySource.ingest({ config: {}, limit: 10, query: "design" });
    expect(results).toHaveLength(1);
    expect(results[0].industry).toBe("Design");
  });
});

describe("apiProviderSource (Adzuna) — freelance/part-time context", () => {
  const originalAppId = process.env.ADZUNA_APP_ID;
  const originalAppKey = process.env.ADZUNA_APP_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";
    fetchMock = vi.fn().mockResolvedValue(textResponse(JSON.stringify({ results: [] })));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ADZUNA_APP_ID = originalAppId;
    process.env.ADZUNA_APP_KEY = originalAppKey;
  });

  function requestedUrl(): string {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return String(fetchMock.mock.calls[0][0]);
  }

  // Regression test: IngestContext declares isFreelanceMode and this
  // adapter reads it to bias the search query and set the API's contract
  // filter, but run.ts never passed it through - so turning on Gig &
  // Musician Mode had zero effect on what discovery actually searched for.
  it("biases the query and sets the contract filter when isFreelanceMode is set", async () => {
    await apiProviderSource.ingest({ config: {}, limit: 10, query: "photographer", isFreelanceMode: true });
    const url = requestedUrl();
    expect(url).toContain("contract=1");
    // URLSearchParams encodes spaces as "+", which decodeURIComponent alone
    // does not turn back into a space - swap those first.
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain("freelance OR gig OR contract");
  });

  it("does not touch the query or contract filter when isFreelanceMode is unset", async () => {
    await apiProviderSource.ingest({ config: {}, limit: 10, query: "photographer" });
    const url = requestedUrl();
    expect(url).not.toContain("contract=1");
    expect(decodeURIComponent(url.replace(/\+/g, " "))).not.toContain("freelance OR gig OR contract");
  });

  it("sets the part_time filter when isPartTimeMode is set", async () => {
    await apiProviderSource.ingest({ config: {}, limit: 10, query: "designer", isPartTimeMode: true });
    expect(requestedUrl()).toContain("part_time=1");
  });
});
