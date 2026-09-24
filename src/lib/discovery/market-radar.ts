import type { DiscoveredJob, Skill } from "@/lib/db/types";
import { requirementCore, requirementSatisfiedBy, canonical } from "@/lib/text-utils";

/**
 * MARKET RADAR - what employers hiring for your target actually ask for,
 * counted from the real, recent postings Work-ly has found for you, set
 * against what your profile shows.
 *
 * Pure counting over stored listings: no model, no estimates. A skill is
 * reported as "in N% of postings" only when N postings actually list it.
 */

export type RadarStatus = "shown" | "listed" | "missing";

export interface RadarItem {
  skill: string;
  count: number;
  share: number;
  status: RadarStatus;
}

export interface MarketRadar {
  sampleSize: number;
  sinceDays: number;
  items: RadarItem[];
  /** Of the top 10 most-asked-for skills, how many your profile shows in real work. */
  shownInTop10: number;
  /** How many of the top 10 you only list, without evidence. */
  listedInTop10: number;
}

export const RADAR_MIN_POSTINGS = 6;
const SINCE_DAYS = 45;
const MAX_CORE_WORDS = 3;

/** Phrases that are requirements but not skills anyone can act on. */
const NOT_A_SKILL = new Set([
  "english", "degree", "bachelor", "bachelors", "team", "teamwork", "work", "remote", "startup", "fast paced",
  "detail oriented", "self starter", "motivated", "passion", "passionate", "travel", "driving license",
]);

/** Title words that mark level rather than the job itself - ignored when matching a posting to the target role. */
const LEVEL_WORDS = new Set(["senior", "sr", "junior", "jr", "lead", "principal", "staff", "associate", "intern", "entry", "level", "mid", "i", "ii", "iii"]);

function titleCore(title: string): Set<string> {
  return new Set(canonical(title).split(" ").filter((w) => w.length > 1 && !LEVEL_WORDS.has(w)));
}

function relevantToTarget(job: DiscoveredJob, targetRole: string | null): boolean {
  if (job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY" || job.recommendation === "STRETCH") return true;
  if (!targetRole) return false;
  const target = titleCore(targetRole);
  if (target.size === 0) return false;
  const title = titleCore(job.title);
  let hit = 0;
  for (const w of target) if (title.has(w)) hit++;
  return hit / target.size >= 0.5;
}

export function buildMarketRadar(params: {
  jobs: DiscoveredJob[];
  skills: Skill[];
  targetRole: string | null;
  now?: number;
}): MarketRadar {
  const now = params.now ?? Date.now();
  const cutoff = now - SINCE_DAYS * 86_400_000;
  const pool = params.jobs.filter(
    (j) =>
      !j.isDismissed &&
      !j.duplicateOfId &&
      new Date(j.postedAt ?? j.discoveredAt).getTime() >= cutoff &&
      relevantToTarget(j, params.targetRole),
  );

  const counts = new Map<string, { count: number; label: string }>();
  for (const job of pool) {
    const seen = new Set<string>();
    for (const raw of [...job.requiredSkills, ...job.preferredSkills]) {
      const core = requirementCore(raw);
      if (!core || core.length < 2 || core.split(" ").length > MAX_CORE_WORDS || NOT_A_SKILL.has(core)) continue;
      if (seen.has(core)) continue;
      seen.add(core);
      const entry = counts.get(core);
      // Keep the shortest original spelling as the display label.
      const label = raw.length <= 40 && (!entry || raw.length < entry.label.length) ? raw.replace(/^[\s\-•]+|[\s.;:]+$/g, "") : entry?.label ?? core;
      counts.set(core, { count: (entry?.count ?? 0) + 1, label });
    }
  }

  const confirmed = params.skills.filter((s) => !s.isTransferable);
  const items: RadarItem[] = Array.from(counts.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([core, v]) => {
      const match = confirmed.find((s) => requirementSatisfiedBy(s.name, core) || requirementSatisfiedBy(s.name, v.label));
      const status: RadarStatus = !match
        ? "missing"
        : match.evidenceLevel === "DEMONSTRATED" || match.evidenceLevel === "CERTIFIED"
          ? "shown"
          : "listed";
      return { skill: v.label, count: v.count, share: pool.length ? v.count / pool.length : 0, status };
    });

  const top10 = items.slice(0, 10);
  return {
    sampleSize: pool.length,
    sinceDays: SINCE_DAYS,
    items,
    shownInTop10: top10.filter((i) => i.status === "shown").length,
    listedInTop10: top10.filter((i) => i.status === "listed").length,
  };
}
