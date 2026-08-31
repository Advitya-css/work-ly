"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import {
  createSource,
  deleteSource,
  getDiscoveredJobById,
  getSourceById,
  listSourcesByUserId,
  setDiscoveredJobConverted,
  setDiscoveredJobDismissed,
  setSourceEnabled,
} from "@/lib/db/discovery";
import { runDiscovery } from "@/lib/discovery/run";
import { getAdapter, SOURCE_ADAPTERS } from "@/lib/discovery/registry";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";

function revalidateDiscoveryViews() {
  revalidatePath("/discover");
  revalidatePath("/dashboard");
}

/**
 * Ensures every zero-config source exists for this account, so a new user
 * has something to discover from without configuring anything. Idempotent.
 *
 * Two sources qualify: the bundled demo feed (fictional, clearly labelled
 * as such) and Arbeitnow (a real, keyless public job board API). Both used
 * to be "the demo feed" alone - now a brand-new account sees real, current
 * listings from the first run, not just fictional ones.
 */
export async function ensureDefaultSourcesAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await checkRateLimit(`discovery_run_${user.id}`, 2, 60))) {
    return { error: "Please wait a minute before running discovery again." };
  }

  const existing = await listSourcesByUserId(user.id);

  // Clean up any existing Demo feeds since we now have real sources
  const demoSources = existing.filter((s) => s.kind === "DEMO");
  for (const demo of demoSources) {
    await deleteSource(demo.id);
  }
  // Delete any fictional jobs that were already imported
  await pool.query(`DELETE FROM discovered_jobs WHERE "sourceKind" = 'DEMO' AND "userId" = $1`, [user.id]);

  // All keyless boards to add
  const keylessIds = ["remotive", "jobicy", "arbeitnow", "himalayas", "themuse"];
  for (const id of keylessIds) {
    if (!existing.some((s) => s.config?.adapterId === id)) {
      const adapter = getAdapter(id);
      if (adapter) {
        await createSource(user.id, {
          kind: adapter.kind,
          name: adapter.name,
          config: { adapterId: adapter.id },
          legalBasis: adapter.legalBasis,
        });
      }
    }
  }

  // All API providers to add (only if configured in env, though we can add them anyway so the user sees them and can configure them)
  const apiIds = ["adzuna", "usajobs", "jooble", "reed", "findwork"];
  for (const id of apiIds) {
    if (!existing.some((s) => s.config?.adapterId === id)) {
      const adapter = getAdapter(id);
      // Let's add them regardless of whether they are fully configured in process.env so they appear in the UI
      if (adapter) {
        await createSource(user.id, {
          kind: adapter.kind,
          name: adapter.name,
          config: { adapterId: adapter.id },
          legalBasis: adapter.legalBasis,
        });
      }
    }
  }

  revalidateDiscoveryViews();
}

export async function runDiscoveryAction(
  query?: string,
  options: { expandSearch?: boolean } = {},
): Promise<{ error?: string; found?: number; upgradeRequired?: boolean; searchTermsUsed?: string[] }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Check rate limit (3 runs per day)
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM discovery_runs WHERE "userId" = $1 AND "startedAt" > NOW() - INTERVAL '24 hours'`,
    [user.id]
  );

  const dailyRuns = parseInt(rows[0].count, 10);
  if (!user.isPro && dailyRuns >= 5) { return { error: "You have reached your free daily limit of 5 AI discoveries.", upgradeRequired: true }; }
  if (user.isPro && dailyRuns >= 30) {
    return { error: "You have reached your daily limit of 3 AI discoveries.", upgradeRequired: true };
  }

  // Guarantees there's at least one real source to run against, with no
  // setup required.
  await ensureDefaultSourcesAction();

  const run = await runDiscovery(user.id, { query, expandSearch: options.expandSearch });
  revalidateDiscoveryViews();

  if (run.status === "FAILED") {
    return { error: run.errorMessage ?? "Discovery failed.", searchTermsUsed: run.searchTermsUsed };
  }
  if (run.sourcesRun === 0 && run.status === "COMPLETED") {
    // If it "completed" but didn't run any sources successfully, every single source must have thrown an error.
    return { error: "All active job sources failed to connect. Please try again shortly.", searchTermsUsed: run.searchTermsUsed };
  }
  return { found: run.newJobs, searchTermsUsed: run.searchTermsUsed };
}

export interface AddSourceInput {
  adapterId: string;
  name?: string;
  boardToken?: string;
  feedUrl?: string;
  careersUrl?: string;
  company?: string;
  keyword?: string;
  locationName?: string;
  country?: string;
  rawText?: string;
}

export async function addSourceAction(input: AddSourceInput): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const adapter = getAdapter(input.adapterId);
  if (!adapter) return { error: "Unknown source type." };

  const config: Record<string, unknown> = { adapterId: adapter.id };
  if (input.boardToken?.trim()) config.boardToken = input.boardToken.trim();
  if (input.feedUrl?.trim()) config.feedUrl = input.feedUrl.trim();
  if (input.careersUrl?.trim()) config.careersUrl = input.careersUrl.trim();
  if (input.company?.trim()) config.company = input.company.trim();
  if (input.keyword?.trim()) config.keyword = input.keyword.trim();
  if (input.locationName?.trim()) config.locationName = input.locationName.trim();
  if (input.country?.trim()) config.country = input.country.trim();
  if (input.rawText?.trim()) config.rawText = input.rawText.trim();

  // A feed URL must be a real http(s) URL - this is the one place a user
  // can point Workly at an arbitrary address, so it's validated here
  // rather than trusted at fetch time.
  if (config.feedUrl && !/^https?:\/\//i.test(String(config.feedUrl))) {
    return { error: "The feed URL must start with http:// or https://" };
  }

  const configured = adapter.isConfigured(config);

  const source = await createSource(user.id, {
    kind: adapter.kind,
    name: input.name?.trim() || adapter.name,
    config,
    legalBasis: adapter.legalBasis,
    status: configured ? "ACTIVE" : "NEEDS_CREDENTIALS",
  });

  revalidateDiscoveryViews();
  return { id: source.id };
}

export async function toggleSourceAction(id: string, enabled: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const source = await getSourceById(id);
  if (!source || source.userId !== user.id) return;
  await setSourceEnabled(id, enabled);
  revalidateDiscoveryViews();
}

export async function deleteSourceAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const source = await getSourceById(id);
  if (!source || source.userId !== user.id) return;
  await deleteSource(id);
  revalidateDiscoveryViews();
}

export async function dismissDiscoveredJobAction(id: string, dismissed = true): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const job = await getDiscoveredJobById(id);
  if (!job || job.userId !== user.id) return;
  await setDiscoveredJobDismissed(id, dismissed);
  revalidateDiscoveryViews();
}

/**
 * Promotes a discovered job into a fully tracked Opportunity by running it
 * through the same Phase 3/4 pipeline a pasted job goes through. Reusing
 * that path rather than writing a shortcut means a promoted job gets a
 * real analysis and priority score, identical to one entered by hand.
 */
export async function trackDiscoveredJobAction(
  id: string,
): Promise<{ error?: string; opportunityId?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const job = await getDiscoveredJobById(id);
  if (!job || job.userId !== user.id) return { error: "Job not found." };
  if (!job.description) {
    return { error: "This listing has no description to analyze. Open the source link and paste it instead." };
  }

  const header = [
    job.title,
    job.company ? `Company: ${job.company}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.industry ? `Industry: ${job.industry}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await submitParseAndAnalyzeJob(user.id, {
    inputMethod: "PASTED_TEXT",
    text: `${header}\n\n${job.description}`,
    url: job.sourceUrl || undefined,
    skipAuthenticityCheck: true,
  });

  if ("error" in result) return { error: result.error };

  await setDiscoveredJobConverted(id, result.opportunityId);
  revalidateDiscoveryViews();
  revalidatePath("/opportunities");
  return { opportunityId: result.opportunityId };
}

/** The adapter catalogue, for the "add a source" UI. */
export async function listAvailableAdaptersAction() {
  // The response holds no user data, but a server action is a public HTTP
  // endpoint all the same. Guarding it keeps the rule exception-free:
  // every action requires a signed-in user.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return SOURCE_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    kind: adapter.kind,
    name: adapter.name,
    legalBasis: adapter.legalBasis,
    requires: adapter.requires ?? null,
    readyWithoutSetup: adapter.id === "demo-feed",
  }));
}
