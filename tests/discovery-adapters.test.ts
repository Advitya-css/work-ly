import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jobPostingSchemaSource } from "@/lib/discovery/sources/company-career";
import { arbeitnowSource } from "@/lib/discovery/sources/keyless-boards";

/**
 * These two adapters are the new legally-clean sources: schema.org
 * JobPosting data any company can publish on its own careers page, and
 * Arbeitnow's open keyless board API. Both need to survive the shapes real
 * pages and APIs actually produce - multiple JobPosting blocks, a
 * @graph-wrapped block, malformed JSON-LD sitting next to good JSON-LD - and
 * neither should ever need credentials to run.
 */

function textResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: async () => body,
  } as Response;
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
