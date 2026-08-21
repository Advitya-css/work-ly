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
export async function ensureDefaultSourcesAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await listSourcesByUserId(user.id);
  const existingKinds = new Set(existing.map((source) => source.kind));

// Clean up any existing Demo feeds since we now have real sources
  const demoSources = existing.filter((s) => s.kind === "DEMO");
  for (const demo of demoSources) {
    await deleteSource(demo.id);
  }
  // Delete any fictional jobs that were already imported
  await pool.query("DELETE FROM discovered_jobs WHERE "sourceKind" = 'DEMO' AND "userId" = $1", [user.id]);

  const hasArbeitnow = existing.some(
    (source) => source.kind === "PUBLIC_JOB_BOARD" && source.config?.adapterId === "arbeitnow",
  );

  const hasAdzuna = existing.some((s) => s.config?.adapterId === "adzuna");
  if (!hasAdzuna) {
    const adapter = getAdapter("adzuna");
    if (adapter && adapter.isConfigured({})) {
      await createSource(user.id, {
        kind: adapter.kind,
        name: adapter.name,
        config: { adapterId: adapter.id },
        legalBasis: adapter.legalBasis,
      });
    }
  }


  const hasUsaJobs = existing.some((s) => s.config?.adapterId === "usajobs");
  if (!hasUsaJobs) {
    const adapter = getAdapter("usajobs");
    if (adapter && adapter.isConfigured({})) {
      await createSource(user.id, {
        kind: adapter.kind,
        name: adapter.name,
        config: { adapterId: adapter.id },
        legalBasis: adapter.legalBasis,
      });
    }
  }


  const hasRemotive = existing.some((s) => s.config?.adapterId === "remotive");
  if (!hasRemotive) {
    const adapter = getAdapter("remotive")!;
    await createSource(user.id, {
      kind: "PUBLIC_JOB_BOARD",
      name: adapter.name,
      config: { adapterId: adapter.id },
      legalBasis: adapter.legalBasis,
    });
  }

  const hasJobicy = existing.some((s) => s.config?.adapterId === "jobicy");
  if (!hasJobicy) {
    const adapter = getAdapter("jobicy")!;
    await createSource(user.id, {
      kind: "PUBLIC_JOB_BOARD",
      name: adapter.name,
      config: { adapterId: adapter.id },
      legalBasis: adapter.legalBasis,
    });
  }

  if (!hasArbeitnow) {
    const adapter = getAdapter("arbeitnow")!;
    await createSource(user.id, {
      kind: "PUBLIC_JOB_BOARD",
      name: adapter.name,
      config: { adapterId: adapter.id },
      legalBasis: adapter.legalBasis,
    });
  }

  revalidateDiscoveryViews();
}

export async function runDiscoveryAction(query?: string): Promise<{ error?: string; found?: number }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Guarantees there's at least one real source to run against, with no
  // setup required.
  await ensureDefaultSourcesAction();

  const run = await runDiscovery(user.id, { query });
  revalidateDiscoveryViews();

  if (run.status === "FAILED") {
    return { error: run.errorMessage ?? "Discovery failed." };
  }
  return { found: run.newJobs };
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
