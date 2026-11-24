import "server-only";

import { pool } from "@/lib/db/pool";
import { storageProvider } from "@/lib/storage";
import { getUserById } from "@/lib/db/users";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { setDiscoveredJobConverted } from "@/lib/db/discovery";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { buildTailoredResume } from "@/lib/resume/tailored-resume";
import { buildFallbackCoverLetter, generateTailoredApplication } from "@/lib/ai/providers/tailor-ai";
import { writeHiringManagerNote } from "@/lib/opportunities/outreach-core";
import { getSavedOutput, saveOutput } from "@/lib/saved-outputs";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import {
  MORNING_LIMIT,
  MORNING_LOOKBACK_DAYS,
  MORNING_MIN_FIT,
  currentMorning,
  mergeMorning,
  pickMorningCandidates,
  reasonFrom,
  type MorningCandidate,
  type MorningFile,
  type MorningItem,
  type MorningKind,
} from "@/lib/morning/morning-core";

/**
 * READY TO APPLY - the half that talks to the database and the model.
 *
 * Runs from cron/ready-to-apply, after the nightly check has found and
 * read the night's listings. No one is signed in, so it never touches the
 * member's hourly AI budget or the usage that counts against the money-back
 * guarantee: this is work they didn't ask for, and it must not cost them.
 *
 * Stored like the saved outputs it writes, as one small private JSON file
 * per member (`generated/<userId>/morning.json`), so there's no schema
 * change. Everything here is best-effort: a failure means a shorter list in
 * the morning, never an error on anyone's screen.
 */

function keyFor(userId: string): string {
  return `generated/${userId.replace(/[^\w-]/g, "")}/morning.json`;
}

async function readFile(userId: string): Promise<MorningFile | null> {
  try {
    const buffer = await storageProvider.download(keyFor(userId));
    const parsed = JSON.parse(buffer.toString("utf8")) as MorningFile;
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeFile(userId: string, file: MorningFile): Promise<void> {
  await storageProvider.upload({
    key: keyFor(userId),
    data: Buffer.from(JSON.stringify(file), "utf8"),
    contentType: "application/json",
  });
}

/** This morning's list for the dashboard, or null. Bounded so a slow read can't hold up Home. */
export async function readMorning(userId: string, timeoutMs = 700): Promise<MorningFile | null> {
  const lookup = readFile(userId).then((file) => currentMorning(file));
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([lookup, timeout]).catch(() => null);
}

async function recentCandidates(userId: string, limit: number): Promise<MorningCandidate[]> {
  const { rows } = await pool.query(
    `SELECT id, title, company, "fitScore", "fitCoverage", recommendation, "matchReasons", description, "discoveredAt"
       FROM discovered_jobs
      WHERE "userId" = $1
        AND "discoveredAt" >= now() - make_interval(days => $2)
        AND "duplicateOfId" IS NULL
        AND "isDismissed" = false
        AND "convertedOpportunityId" IS NULL
        AND recommendation IN ('APPLY_NOW', 'APPLY')
        AND "fitScore" >= $3
      ORDER BY "fitScore" DESC
      LIMIT 30`,
    [userId, MORNING_LOOKBACK_DAYS, MORNING_MIN_FIT],
  );
  return pickMorningCandidates(
    rows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? "Untitled role"),
      company: r.company ?? null,
      fitScore: r.fitScore == null ? null : Number(r.fitScore),
      fitCoverage: r.fitCoverage == null ? null : Number(r.fitCoverage),
      recommendation: r.recommendation ?? null,
      matchReasons: Array.isArray(r.matchReasons) ? r.matchReasons : [],
      description: r.description ?? null,
      discoveredAt: r.discoveredAt,
    })),
    { limit, minCoverage: MIN_COVERAGE_FOR_SCORE },
  );
}

export interface PrepareResult {
  considered: number;
  written: number;
  /** Listings that looked good but came out of the full check as something other than "apply". */
  skipped: number;
}

/**
 * Tonight's applications for one member. Each candidate goes through the
 * same pipeline as a job they paste in, so it gets a real verdict; only
 * the ones still marked "apply" after that are written for.
 */
export async function prepareMorning(
  userId: string,
  options: { limit?: number; budgetMs?: number } = {},
): Promise<PrepareResult> {
  const started = Date.now();
  const budgetMs = options.budgetMs ?? 150_000;
  const result: PrepareResult = { considered: 0, written: 0, skipped: 0 };

  const [user, profile] = await Promise.all([getUserById(userId), getFullCareerProfile(userId)]);
  if (!user || !profile.profile) return result;
  // Nothing to tailor from: writing would only produce placeholders.
  if (profile.experiences.length === 0 && profile.projects.length === 0) return result;

  const candidates = await recentCandidates(userId, options.limit ?? MORNING_LIMIT);
  const tonight: MorningItem[] = [];

  for (const job of candidates) {
    // Each listing takes four model calls; stop before the function's limit.
    if (Date.now() - started > budgetMs) break;
    result.considered++;
    try {
      const header = [job.title, job.company ? `Company: ${job.company}` : null].filter(Boolean).join("\n");
      const submitted = await submitParseAndAnalyzeJob(userId, {
        inputMethod: "PASTED_TEXT",
        text: `${header}\n\n${job.description ?? ""}`,
        skipAuthenticityCheck: true,
      });
      if ("error" in submitted) continue;
      await setDiscoveredJobConverted(job.id, submitted.opportunityId);

      const opp = await getOpportunityWithJobById(userId, submitted.opportunityId);
      if (!opp) continue;
      // The full check is the one that counts. A listing it no longer calls
      // an "apply" stays in their jobs with its honest verdict, unwritten.
      if (opp.recommendation !== "APPLY_NOW" && opp.recommendation !== "APPLY") {
        result.skipped++;
        continue;
      }

      const kinds: MorningKind[] = [];
      const id = opp.id;

      const haveResume = await getSavedOutput(userId, "resume", id);
      if (haveResume) kinds.push("resume");
      else {
        const resume = await buildTailoredResume(profile, opp.job).catch(() => null);
        if (resume && (await saveOutput(userId, "resume", id, resume))) kinds.push("resume");
      }

      const haveCover = await getSavedOutput(userId, "cover", id);
      if (haveCover) kinds.push("cover");
      else {
        const letter = await generateTailoredApplication(profile, opp.job, { name: user.name }).catch(() =>
          buildFallbackCoverLetter(profile, opp.job, { name: user.name }),
        );
        if (await saveOutput(userId, "cover", id, letter)) kinds.push("cover");
      }

      const haveNote = await getSavedOutput(userId, "note", id);
      if (haveNote) kinds.push("note");
      else {
        const note = await writeHiringManagerNote(profile, opp.job, user.name).catch(() => null);
        if (note && (await saveOutput(userId, "note", id, note))) kinds.push("note");
      }

      if (kinds.length === 0) continue;
      tonight.push({
        opportunityId: id,
        title: opp.job.title ?? job.title,
        company: opp.job.company ?? job.company,
        fitScore: opp.fitScore ?? job.fitScore,
        reason: reasonFrom(job.matchReasons),
        kinds,
      });
      result.written++;
    } catch (error) {
      console.error(`[workly:morning] couldn't prepare a listing for ${userId}:`, error);
    }
  }

  if (tonight.length > 0) {
    const previous = await readFile(userId);
    await writeFile(userId, mergeMorning(previous, tonight)).catch((error) =>
      console.warn("[workly:morning] couldn't save the list:", error instanceof Error ? error.message : error),
    );
  }
  return result;
}

export interface MorningPreviewItem {
  id: string;
  title: string;
  company: string | null;
  fitScore: number | null;
  reason: string | null;
}

/**
 * For a free account: the listings Pro would have written for, from the
 * matches already found for them (rules engine, no model). Nothing has
 * been written, and the card that shows these says so.
 */
export async function morningPreview(userId: string, limit = MORNING_LIMIT): Promise<MorningPreviewItem[]> {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, company, "fitScore", "fitCoverage", recommendation, "matchReasons", description, "discoveredAt"
         FROM discovered_jobs
        WHERE "userId" = $1
          AND "discoveredAt" >= now() - interval '7 days'
          AND "duplicateOfId" IS NULL
          AND "isDismissed" = false
          AND recommendation IN ('APPLY_NOW', 'APPLY')
          AND "fitScore" >= $2
        ORDER BY "fitScore" DESC
        LIMIT 20`,
      [userId, MORNING_MIN_FIT],
    );
    const picked = pickMorningCandidates(
      rows.map((r) => ({
        id: String(r.id),
        title: String(r.title ?? "Untitled role"),
        company: r.company ?? null,
        fitScore: r.fitScore == null ? null : Number(r.fitScore),
        fitCoverage: r.fitCoverage == null ? null : Number(r.fitCoverage),
        recommendation: r.recommendation ?? null,
        matchReasons: Array.isArray(r.matchReasons) ? r.matchReasons : [],
        description: r.description ?? null,
        discoveredAt: r.discoveredAt,
      })),
      // A free account's matches come from a slower, every-few-days search.
      { limit, minCoverage: MIN_COVERAGE_FOR_SCORE, lookbackDays: 7 },
    );
    return picked.map((p) => ({ id: p.id, title: p.title, company: p.company, fitScore: p.fitScore, reason: reasonFrom(p.matchReasons) }));
  } catch {
    return [];
  }
}
