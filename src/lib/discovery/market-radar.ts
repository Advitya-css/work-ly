import type { DiscoveredJob, Skill } from "@/lib/db/types";
import { requirementCore, requirementSatisfiedBy } from "@/lib/text-utils";
import { titleIsRelevant } from "@/lib/discovery/relevance";

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
  "communication", "communication skills", "written communication", "collaboration", "problem solving",
  "operations", "sales", "marketing", "leadership", "analytical", "analytical skills", "ownership", "curiosity",
]);

/** How a skill is shown on the card: "sql" -> "SQL", "power bi" -> "Power BI", "tableau" -> "Tableau". */
const DISPLAY: Record<string, string> = {
  sql: "SQL", aws: "AWS", gcp: "GCP", "ci/cd": "CI/CD", "ci cd": "CI/CD", "power bi": "Power BI", etl: "ETL", elt: "ELT",
  dbt: "dbt", api: "API", apis: "APIs", nlp: "NLP", llm: "LLM", llms: "LLMs", ml: "ML", ai: "AI", bi: "BI",
  "a/b testing": "A/B testing", "a b testing": "A/B testing", javascript: "JavaScript", typescript: "TypeScript",
  bigquery: "BigQuery", postgresql: "PostgreSQL", mysql: "MySQL", nosql: "NoSQL", pyspark: "PySpark", github: "GitHub",
};
function displaySkill(label: string): string {
  const key = label.trim().toLowerCase();
  if (DISPLAY[key]) return DISPLAY[key];
  if (label !== key) return label; // the posting already capitalised it
  return key.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function relevantToTarget(job: DiscoveredJob, targets: string[]): boolean {
  if (job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY") return true;
  if (targets.length === 0) return job.recommendation === "STRETCH";
  // Same field test Discover uses: "Senior DevOps Engineer" is not an
  // Analytics Engineer posting just because both titles say "Engineer".
  return titleIsRelevant(job.title, targets);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildMarketRadar(params: {
  jobs: DiscoveredJob[];
  skills: Skill[];
  targetRole: string | null;
  /** Secondary target roles - postings for these count too. */
  otherRoles?: string[];
  /** The candidate's own role, project and achievement text. A skill named there counts as shown in real work. */
  evidenceText?: string;
  now?: number;
}): MarketRadar {
  const now = params.now ?? Date.now();
  const cutoff = now - SINCE_DAYS * 86_400_000;
  const pool = params.jobs.filter(
    (j) =>
      !j.isDismissed &&
      !j.duplicateOfId &&
      new Date(j.postedAt ?? j.discoveredAt).getTime() >= cutoff &&
      relevantToTarget(j, [params.targetRole, ...(params.otherRoles ?? [])].filter((t): t is string => Boolean(t?.trim()))),
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
      const namedInWork = (name: string) =>
        Boolean(params.evidenceText) && new RegExp(`(^|[^a-z0-9])${escapeRegExp(name.toLowerCase())}([^a-z0-9]|$)`).test(params.evidenceText!.toLowerCase());
      const status: RadarStatus = !match
        ? "missing"
        : match.evidenceLevel === "DEMONSTRATED" || match.evidenceLevel === "CERTIFIED" || namedInWork(match.name)
          ? "shown"
          : "listed";
      return { skill: displaySkill(v.label), count: v.count, share: pool.length ? v.count / pool.length : 0, status };
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
