import { greenhouseSource, leverSource, jobPostingSchemaSource } from "@/lib/discovery/sources/company-career";
import { employerFeedSource, universitySource, publicJobBoardSource } from "@/lib/discovery/sources/feeds";
import { governmentSource } from "@/lib/discovery/sources/government";
import { apiProviderSource } from "@/lib/discovery/sources/api-provider";
import { joobleSource } from "@/lib/discovery/sources/jooble";
import { reedSource } from "@/lib/discovery/sources/reed";
import { findworkSource } from "@/lib/discovery/sources/findwork";
import { manualImportSource } from "@/lib/discovery/sources/manual-import";
import { demoFeedSource } from "@/lib/discovery/sources/demo-feed";
import { arbeitnowSource, remotiveSource, jobicySource, himalayasSource, museSource } from "@/lib/discovery/sources/keyless-boards";
import type { JobSourceAdapter } from "@/lib/discovery/types";

/**
 * Registry of every adapter Workly knows how to run.
 *
 * All seven source kinds from the Phase 8 spec are represented. What
 * differs is what each needs before it can actually run:
 *
 *   Runs immediately, no setup, real listings:
 *     - arbeitnow      (open keyless public board API)
 *
 *   Runs immediately, no setup, demonstration/user-supplied:
 *     - demo-feed      (bundled fictional listings)
 *     - manual-import  (text the user pastes)
 *
 *   Runs once the user supplies a URL or handle - no account needed:
 *     - greenhouse, lever              (a company's board token)
 *     - jobposting-schema              (any careers page publishing schema.org JobPosting data)
 *     - employer-feed, university-feed, public-board-feed  (a feed URL)
 *
 *   Runs once credentials are in the environment:
 *     - usajobs  (free registered API key)
 *     - adzuna   (the user's own licensed API credentials)
 *
 * Every adapter carries a written `legalBasis`. Nothing here scrapes a site
 * that prohibits it; adding a source that did would mean writing a
 * justification that couldn't honestly be written.
 */
export const SOURCE_ADAPTERS: JobSourceAdapter[] = [
  demoFeedSource,
  manualImportSource,
  arbeitnowSource,
  remotiveSource,
  jobicySource,
  himalayasSource,
  museSource,
  greenhouseSource,
  leverSource,
  jobPostingSchemaSource,
  employerFeedSource,
  universitySource,
  publicJobBoardSource,
  governmentSource,
  apiProviderSource,
  joobleSource,
  reedSource,
  findworkSource,
];

export function getAdapter(id: string): JobSourceAdapter | undefined {
  return SOURCE_ADAPTERS.find((adapter) => adapter.id === id);
}

/** Adapters that can run with no user setup at all - what a brand-new account can use today. */
export function zeroConfigAdapters(): JobSourceAdapter[] {
  return SOURCE_ADAPTERS.filter((adapter) => adapter.id === "demo-feed" || adapter.id === "arbeitnow" || adapter.id === "remotive" || adapter.id === "jobicy" || adapter.id === "himalayas" || adapter.id === "themuse");
}
