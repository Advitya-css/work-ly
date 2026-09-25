import "server-only";
import { matchSourceTense } from "@/lib/resume/tense";

import {
  NO_FABRICATION_RULES,
  completeStructured,
  jobBrief,
  str,
  unsupportedNumbers,
} from "@/lib/ai/career-context";
import { normalizeForMatch, quoteFound } from "@/lib/scoring/screen-core";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { Job } from "@/lib/db/types";

/**
 * TAILORED RESUME - an apply-ready document for one job.
 *
 * Division of labour, deliberately strict:
 *   - FACTS come from the database only: names, employers, titles, dates,
 *     schools, certifications. The model never writes one of these.
 *   - The model chooses, orders and rewrites: which real bullets matter for
 *     this job, how to phrase them, which of the candidate's real skills to
 *     lead with, and a 2-3 sentence summary.
 *   - Every rewritten bullet must name the original line it came from, and
 *     that line must exist in that role's description. Any number the
 *     original didn't contain is flagged, not shipped silently.
 */

export interface TailoredResumeRole {
  title: string;
  company: string;
  location: string | null;
  dates: string;
  bullets: string[];
}

export interface TailoredResume {
  summary: string;
  roles: TailoredResumeRole[];
  projects: { name: string; bullets: string[] }[];
  skills: string[];
  education: { line: string; dates: string }[];
  certifications: string[];
  /** Keywords from the job the candidate can honestly claim, for the user to double-check coverage. */
  keywordsCovered: string[];
  /** Job keywords that are NOT supported by the profile - never inserted, shown so the user knows. */
  keywordsMissing: string[];
  /** Numbers that appeared in rewritten text but not in the source line. */
  unverifiedNumbers: string[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
function dateRange(start: Date | null, end: Date | null, current: boolean): string {
  const s = fmt(start);
  const e = current ? "Present" : fmt(end);
  return [s, e].filter(Boolean).join(" – ");
}

/** The candidate's own lines for one role: description split into bullets/sentences. */
function sourceLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((l) => l.replace(/^[\s•\-*●▪◦]+/, "").trim())
    .filter((l) => l.length > 3);
}

const SYSTEM = `You tailor a candidate's EXISTING resume content to ONE job. You never add facts.
For each ROLE (by its id), return bullets ordered by relevance to the JOB: 3-5 for R1 (the most recent role) and 2-4 for the others, fewer only when the role has fewer LINES. Each bullet has "basedOn" (one line copied exactly from that role's LINES) and "text" (the rewrite: keep the TENSE of the basedOn line - if it starts "Built", the rewrite starts with a past-tense verb too, never "Build" - then the tool/domain this job cares about and the real outcome). KEEP EVERY NUMBER, metric and scale from the basedOn line exactly as written (counts, percentages, team sizes, time saved) - they are the candidate's strongest proof, and a rewrite that drops them is worse than the original. Roles with no LINES get no bullets. You may skip weak or irrelevant lines, but never skip a line with a measurable result that is relevant to the JOB.
For each PROJECT (by its id) that is relevant, return 1-2 bullets the same way; omit irrelevant projects.
"skills": up to 14 names chosen ONLY from the SKILLS list, most relevant to the job first, copied exactly.
"summary": 2-3 sentences positioning the candidate for this job using only real facts: their actual title, years of experience if given, the 2 most relevant tools, and their single strongest measurable result. No first person, no clichés ("results-driven", "passionate", "extensive experience").
"keywordsCovered": up to 10 exact phrases from the JOB the candidate can honestly claim. "keywordsMissing": up to 8 phrases from the JOB the candidate cannot claim.
${NO_FABRICATION_RULES}`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          bullets: {
            type: "array",
            items: {
              type: "object",
              properties: { basedOn: { type: "string" }, text: { type: "string" } },
              required: ["basedOn", "text"],
            },
          },
        },
        required: ["id", "bullets"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          bullets: {
            type: "array",
            items: {
              type: "object",
              properties: { basedOn: { type: "string" }, text: { type: "string" } },
              required: ["basedOn", "text"],
            },
          },
        },
        required: ["id", "bullets"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
    keywordsCovered: { type: "array", items: { type: "string" } },
    keywordsMissing: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "roles", "projects", "skills", "keywordsCovered", "keywordsMissing"],
};

type RawBullets = { id?: unknown; bullets?: unknown };

function groundedBullets(raw: RawBullets | undefined, lines: string[], flagged: Set<string>, max: number): string[] {
  if (!raw || !Array.isArray(raw.bullets)) return [];
  const source = lines.join("\n");
  const out: string[] = [];
  for (const b of raw.bullets) {
    const r = b as Record<string, unknown>;
    const basedOn = str(r?.basedOn, 500);
    const text = str(r?.text, 400);
    if (!basedOn || !text || !quoteFound(basedOn, source)) continue;
    for (const n of unsupportedNumbers(text, basedOn)) flagged.add(n);
    // A rewrite that loses the original's numbers ("Built 40+ dbt models ...
    // used by 120 city managers" -> "Built dbt models") throws away the
    // proof. Keep the candidate's own line instead.
    const lostNumbers = unsupportedNumbers(basedOn, text).length > 0;
    out.push((lostNumbers ? basedOn : matchSourceTense(text, basedOn)).replace(/^[\s•\-*]+/, ""));
    if (out.length >= max) break;
  }
  return out;
}

export async function buildTailoredResume(profile: FullCareerProfile, job: Job): Promise<TailoredResume | null> {
  const roles = [...profile.experiences].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime();
  });
  const roleLines = roles.map((r) => sourceLines(r.description));
  const projectLines = profile.projects.map((p) => sourceLines(p.description));
  const skillNames = profile.skills.filter((s) => !s.isTransferable).map((s) => s.name);

  const candidate = [
    profile.profile?.headline ? `HEADLINE: ${profile.profile.headline}` : null,
    profile.profile?.summary ? `SUMMARY: ${profile.profile.summary}` : null,
    profile.profile?.yearsExperience != null ? `YEARS OF EXPERIENCE: ${profile.profile.yearsExperience}` : null,
    ...roles.map(
      (r, i) =>
        `ROLE R${i + 1}: ${r.title} at ${r.company} (${dateRange(r.startDate, r.endDate, r.isCurrent)})\nLINES:\n${
          roleLines[i].length ? roleLines[i].map((l) => `- ${l}`).join("\n") : "(none)"
        }`,
    ),
    ...profile.projects.map(
      (p, i) => `PROJECT P${i + 1}: ${p.name}\nLINES:\n${projectLines[i].length ? projectLines[i].map((l) => `- ${l}`).join("\n") : "(none)"}`,
    ),
    `SKILLS: ${skillNames.join(", ") || "(none)"}`,
    ...profile.educations.map((e) => `EDUCATION: ${[e.degree, e.fieldOfStudy, e.institution].filter(Boolean).join(", ")}`),
    ...profile.certifications.map((c) => `CERTIFICATION: ${[c.name, c.issuer].filter(Boolean).join(", ")}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  const flagged = new Set<string>();
  const result = await completeStructured({
    system: SYSTEM,
    user: `JOB\n===\n${jobBrief(job, job.title ?? "this role", job.company, 5000)}\n\nCANDIDATE\n=========\n${candidate.slice(0, 14000)}`,
    schema: SCHEMA,
    temperature: 0.3,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const summary = str(r.summary, 700);
      if (!summary) return null;
      const byId = (list: unknown, prefix: string, i: number) =>
        Array.isArray(list)
          ? (list as RawBullets[]).find((x) => typeof x?.id === "string" && x.id.replace(/[[\]\s]/g, "").toUpperCase() === `${prefix}${i + 1}`)
          : undefined;

      const tailoredRoles: TailoredResumeRole[] = roles.map((role, i) => ({
        title: role.title,
        company: role.company,
        location: role.location,
        dates: dateRange(role.startDate, role.endDate, role.isCurrent),
        bullets: groundedBullets(byId(r.roles, "R", i), roleLines[i], flagged, 5),
      }));
      // A role the model skipped keeps its original lines rather than vanishing.
      for (let i = 0; i < tailoredRoles.length; i++) {
        if (tailoredRoles[i].bullets.length === 0 && roleLines[i].length > 0) tailoredRoles[i].bullets = roleLines[i].slice(0, 3);
      }

      const tailoredProjects = profile.projects
        .map((p, i) => ({ name: p.name, bullets: groundedBullets(byId(r.projects, "P", i), projectLines[i], flagged, 2) }))
        .filter((p) => p.bullets.length > 0)
        .slice(0, 3);

      const known = new Map(skillNames.map((s) => [normalizeForMatch(s), s]));
      const skills = Array.isArray(r.skills)
        ? Array.from(
            new Set(
              r.skills
                .map((s) => (typeof s === "string" ? known.get(normalizeForMatch(s)) : undefined))
                .filter((s): s is string => Boolean(s)),
            ),
          ).slice(0, 14)
        : [];

      for (const n of unsupportedNumbers(summary, candidate)) flagged.add(n);

      const candidateText = normalizeForMatch(candidate);
      const supported = (phrase: string) => {
        const words = normalizeForMatch(phrase).split(" ").filter((w) => w.length > 2);
        return words.length > 0 && words.every((w) => candidateText.includes(w.slice(0, Math.max(4, w.length - 2))));
      };
      const mentionsKnownSkill = (phrase: string) => {
        const p = ` ${normalizeForMatch(phrase)} `;
        return skillNames.some((name) => {
          const n = normalizeForMatch(name);
          return n.length > 1 && p.includes(` ${n} `);
        });
      };
      const list = (v: unknown, max: number) =>
        Array.isArray(v) ? v.map((x) => str(x, 80)).filter((x): x is string => Boolean(x)).slice(0, max) : [];

      return {
        summary,
        roles: tailoredRoles,
        projects: tailoredProjects,
        skills: skills.length > 0 ? skills : skillNames.slice(0, 14),
        education: profile.educations.map((e) => ({
          line: [[e.degree, e.fieldOfStudy].filter(Boolean).join(", "), e.institution].filter(Boolean).join(" — "),
          dates: dateRange(e.startDate, e.endDate, false),
        })),
        certifications: profile.certifications.map((c) => [c.name, c.issuer].filter(Boolean).join(", ")),
        // "Covered" has to be literally supported by the candidate's own text -
        // the model listed "forecasts" for someone who never forecast anything.
        keywordsCovered: list(r.keywordsCovered, 16).filter((k) => supported(k)).slice(0, 10),
        // And a "missing" phrase can't contradict a covered one ("Tableau,
        // Looker, or similar tools" listed as missing next to Tableau and Looker).
        keywordsMissing: list(r.keywordsMissing, 12).filter((k) => !supported(k) && !mentionsKnownSkill(k)).slice(0, 8),
        unverifiedNumbers: [],
      } satisfies TailoredResume;
    },
  });
  if (!result) return null;
  return { ...result, unverifiedNumbers: Array.from(flagged) };
}
