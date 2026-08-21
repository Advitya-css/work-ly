import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * GOVERNMENT SOURCE - USAJOBS.
 *
 * LEGAL BASIS: USAJOBS operates a documented public Search API for
 * third-party developers. It requires a free registered API key and a
 * User-Agent identifying the caller, both of which this adapter supplies.
 * Using it as documented, with an issued key, is exactly its intended use.
 *
 * The key lives in the environment (USAJOBS_API_KEY / USAJOBS_USER_AGENT),
 * never in the database - JobSourceConfig.config is for non-secret
 * settings only.
 */

interface UsaJobsItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: {
    PositionTitle?: string;
    PositionURI?: string;
    OrganizationName?: string;
    DepartmentName?: string;
    PositionLocationDisplay?: string;
    PublicationStartDate?: string;
    QualificationSummary?: string;
    PositionSchedule?: { Name?: string }[];
    PositionRemuneration?: { MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }[];
    UserArea?: { Details?: { JobSummary?: string } };
  };
}

export const governmentSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "GOVERNMENT",
  id: "usajobs",
  name: "USAJOBS",
  legalBasis:
    "USAJOBS publishes a documented Search API for third-party developers, accessed with a free registered API key and an identifying User-Agent. This adapter uses it exactly as documented, read-only.",
  requires: "USAJOBS_API_KEY and USAJOBS_USER_AGENT environment variables (free registration)",

  isConfigured() {
    // Secrets come from the environment, not from stored config.
    return Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT);
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgent = process.env.USAJOBS_USER_AGENT;
    if (!apiKey || !userAgent) return [];

    const keyword = String(context.config.keyword ?? context.query ?? "").trim();
    const params = new URLSearchParams({
      ResultsPerPage: String(Math.min(context.limit, 100)),
    });
    if (keyword) params.set("Keyword", keyword);
    const locationName = asString(context.config.locationName);
    if (locationName) params.set("LocationName", locationName);

    const body = await fetchWithGuards(`https://data.usajobs.gov/api/search?${params.toString()}`, {
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": userAgent,
        "Authorization-Key": apiKey,
      },
    });

    const parsed = JSON.parse(body) as { SearchResult?: { SearchResultItems?: UsaJobsItem[] } };
    const items = parsed.SearchResult?.SearchResultItems ?? [];

    return items.slice(0, context.limit).map((item) => {
      const d = item.MatchedObjectDescriptor ?? {};
      const pay = d.PositionRemuneration?.[0];
      // USAJOBS quotes some roles hourly; storing an hourly figure in an
      // annual-salary field would misrepresent the role, so only annual
      // ("PA") figures are carried across.
      const isAnnual = pay?.RateIntervalCode === "PA";
      const toInt = (value?: string) => {
        const n = value ? Number.parseFloat(value) : NaN;
        return Number.isFinite(n) ? Math.round(n) : null;
      };

      return {
        externalId: `usajobs:${item.MatchedObjectId ?? d.PositionURI ?? d.PositionTitle}`,
        title: asString(d.PositionTitle) ?? "Untitled role",
        company: asString(d.OrganizationName) ?? asString(d.DepartmentName),
        location: asString(d.PositionLocationDisplay),
        country: "United States",
        description:
          asString(d.UserArea?.Details?.JobSummary) ?? asString(d.QualificationSummary),
        url: asString(d.PositionURI),
        postedAt: asDate(d.PublicationStartDate),
        salaryMin: isAnnual ? toInt(pay?.MinimumRange) : null,
        salaryMax: isAnnual ? toInt(pay?.MaximumRange) : null,
        salaryCurrency: isAnnual ? "USD" : null,
        employmentTypeRaw: asString(d.PositionSchedule?.[0]?.Name),
        industry: asString(d.DepartmentName),
      };
    });
  },
};
