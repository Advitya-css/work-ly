/**
 * Types and pure helpers for the tailored resume, shared by the builder
 * (server), the editor (client) and tests.
 */

export interface TailoredResumeRole {
  title: string;
  company: string;
  location: string | null;
  dates: string;
  bullets: string[];
  /**
   * For each bullet, the candidate's own line it was rewritten from, or
   * null when the line went in as it was. Lets the editor show exactly what
   * changed for this job.
   */
  from?: (string | null)[];
  /** For each bullet, words the rewrite added that aren't on the profile ("designed", "product"). */
  added?: string[][];
}

export interface TailoredResumeProject {
  name: string;
  bullets: string[];
  from?: (string | null)[];
  added?: string[][];
}

export interface TailoredResume {
  /** Name, headline and contact line as the user last edited them (defaults come from the profile). */
  header?: { name?: string; headline?: string; contact?: string };
  summary: string;
  roles: TailoredResumeRole[];
  projects: TailoredResumeProject[];
  skills: string[];
  education: { line: string; dates: string }[];
  certifications: string[];
  /** Keywords from the job the candidate can honestly claim, for the user to double-check coverage. */
  keywordsCovered: string[];
  /** Job keywords that are NOT supported by the profile - never inserted, shown so the user knows. */
  keywordsMissing: string[];
  /** Numbers that appeared in rewritten text but not in the source line. */
  unverifiedNumbers: string[];
  /** Lines on the profile that were left out because they don't matter for this job. */
  leftOut?: number;
}

export interface ResumeChangeStats {
  rewritten: number;
  kept: number;
  leftOut: number;
  /** Rewritten lines that use words not found anywhere on the profile. */
  toCheck: number;
}

export function resumeChangeStats(resume: TailoredResume): ResumeChangeStats {
  let rewritten = 0;
  let kept = 0;
  let toCheck = 0;
  for (const block of [...resume.roles, ...resume.projects]) {
    block.bullets.forEach((bullet, i) => {
      if (!bullet) return; // cleared in the editor
      if (block.from?.[i]) rewritten++;
      else kept++;
      if ((block.added?.[i]?.length ?? 0) > 0) toCheck++;
    });
  }
  return { rewritten, kept, leftOut: resume.leftOut ?? 0, toCheck };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Mar 2021", or just "2021" when the date is the 1st of January - which is
 * how a year-only date ("2019") is stored. Printing "Jan 2019" for a degree
 * the user dated only by year invents a month.
 */
export function resumeDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const yearOnly = date.getUTCMonth() === 0 && date.getUTCDate() === 1;
  return yearOnly ? `${date.getUTCFullYear()}` : `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function resumeDateRange(start: Date | string | null, end: Date | string | null, current: boolean): string {
  const s = resumeDate(start);
  const e = current ? "Present" : resumeDate(end);
  if (s && e && s === e) return s;
  return [s, e].filter(Boolean).join(" – ");
}

// ---------------------------------------------------------------------------
// Validating a resume the user edited in the browser before it's saved.
// ---------------------------------------------------------------------------

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
function textList(value: unknown, maxItems: number, maxLen: number): string[] {
  return Array.isArray(value) ? value.map((v) => text(v, maxLen)).filter(Boolean).slice(0, maxItems) : [];
}
function fromList(value: unknown, length: number): (string | null)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from({ length }, (_, i) => (typeof value[i] === "string" ? text(value[i], 500) || null : null));
}

/**
 * Accepts only the resume's own shape, with every string capped. Bullets
 * the user emptied are dropped (with their "from" line), which is how a
 * bullet is deleted in the editor.
 */
export function cleanEditedResume(raw: unknown): TailoredResume | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const summary = text(r.summary, 1200);

  const blocks = <T extends { bullets: string[]; from?: (string | null)[]; added?: string[][] }>(list: unknown, build: (o: Record<string, unknown>) => Omit<T, "bullets" | "from"> | null, max: number): T[] =>
    (Array.isArray(list) ? list : [])
      .slice(0, max)
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const base = build(o);
        if (!base) return null;
        const rawBullets = Array.isArray(o.bullets) ? o.bullets : [];
        const rawFrom = fromList(o.from, rawBullets.length);
        const rawAdded = Array.isArray(o.added) ? o.added : null;
        const bullets: string[] = [];
        const from: (string | null)[] = [];
        const added: string[][] = [];
        rawBullets.slice(0, 12).forEach((b, i) => {
          const t = text(b, 600);
          if (!t) return;
          bullets.push(t);
          from.push(rawFrom?.[i] ?? null);
          added.push(textList(rawAdded?.[i], 12, 40));
        });
        return { ...base, bullets, from: rawFrom ? from : undefined, added: rawAdded ? added : undefined } as T;
      })
      .filter((x): x is T => x !== null);

  const roles = blocks<TailoredResumeRole>(
    r.roles,
    (o) => {
      const title = text(o.title, 200);
      const company = text(o.company, 200);
      if (!title && !company) return null;
      return { title, company, location: text(o.location, 120) || null, dates: text(o.dates, 60) };
    },
    20,
  );
  const projects = blocks<TailoredResumeProject>(
    r.projects,
    (o) => {
      const name = text(o.name, 200);
      return name ? { name } : null;
    },
    8,
  );

  const header = r.header && typeof r.header === "object" ? (r.header as Record<string, unknown>) : null;
  const education = (Array.isArray(r.education) ? r.education : [])
    .slice(0, 8)
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return { line: text(o.line, 300), dates: text(o.dates, 60) };
    })
    .filter((e) => e.line);

  return {
    header: header
      ? {
          name: text(header.name, 120) || undefined,
          headline: text(header.headline, 200) || undefined,
          contact: text(header.contact, 300) || undefined,
        }
      : undefined,
    summary,
    roles,
    projects,
    skills: textList(r.skills, 30, 80),
    education,
    certifications: textList(r.certifications, 12, 200),
    keywordsCovered: textList(r.keywordsCovered, 12, 80),
    keywordsMissing: textList(r.keywordsMissing, 10, 80),
    unverifiedNumbers: textList(r.unverifiedNumbers, 12, 40),
    leftOut: typeof r.leftOut === "number" && Number.isFinite(r.leftOut) ? Math.max(0, Math.min(200, Math.round(r.leftOut))) : undefined,
  };
}

/** The resume as plain text, for pasting into an application form. */
export function resumeAsText(resume: TailoredResume, fallback: { name: string; headline: string | null; contact: string }): string {
  const name = resume.header?.name ?? fallback.name;
  const headline = resume.header?.headline ?? fallback.headline;
  const contact = resume.header?.contact ?? fallback.contact;
  const lines: string[] = [name, headline ?? "", contact, ""];
  if (resume.summary) lines.push("SUMMARY", resume.summary, "");
  if (resume.roles.length) {
    lines.push("EXPERIENCE");
    for (const role of resume.roles) {
      lines.push([`${role.title}, ${role.company}`, role.location, role.dates].filter(Boolean).join(" | "));
      role.bullets.filter(Boolean).forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }
  }
  if (resume.projects.length) {
    lines.push("PROJECTS");
    for (const p of resume.projects) {
      lines.push(p.name);
      p.bullets.filter(Boolean).forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }
  }
  if (resume.skills.length) lines.push("SKILLS", resume.skills.join(", "), "");
  if (resume.education.length) {
    lines.push("EDUCATION");
    resume.education.forEach((e) => lines.push([e.line, e.dates].filter(Boolean).join(" | ")));
    lines.push("");
  }
  if (resume.certifications.length) lines.push("CERTIFICATIONS", resume.certifications.join(", "));
  return lines
    .filter((l, i, all) => !(l === "" && all[i - 1] === ""))
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Words a rewrite added that the candidate never wrote.
// ---------------------------------------------------------------------------

const GRAMMAR = new Set(
  "the a an and or of for to in on at by with from into over across through using via as that which who whose this these those its their our your was were been being has have had more than per each every while within without about after before during both such also then when where".split(
    " ",
  ),
);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.\-]*[a-z+#]|[a-z]/g) ?? []).flatMap((w) => w.split(/[-.]/)).filter(Boolean);
}

function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(5, a.length, b.length);
  return n >= 4 && a.slice(0, n) === b.slice(0, n);
}

/**
 * Content words in a rewritten line that appear neither in the line it came
 * from nor anywhere else on the profile: "Designed and ran 18 A/B tests
 * ... with product teams" from "Ran 18 A/B tests" adds "designed" and
 * "product". Those are claims, and the user should see them before sending.
 * Matching is loose on purpose (model/models, power/powering) so ordinary
 * rephrasing isn't flagged.
 */
const ABBREVIATIONS: Record<string, string[]> = {
  ops: ["operations", "operational"],
  mgmt: ["management"],
  eng: ["engineering"],
  dev: ["development", "developer"],
  infra: ["infrastructure"],
  analytics: ["analysis", "analytical"],
  analysis: ["analytics", "analytical"],
  bi: ["business", "intelligence"],
  ml: ["machine", "learning"],
  ab: ["experiment", "experiments", "experimentation", "test", "tests", "testing"],
  automated: ["automation"],
  kpi: ["metric", "metrics"],
  kpis: ["metric", "metrics"],
};

export function addedWords(rewrite: string, source: string, profileText: string): string[] {
  const base = [...words(source), ...words(profileText)];
  const known = [...base, ...base.flatMap((w) => ABBREVIATIONS[w] ?? [])];
  const knownSet = new Set(known);
  const out: string[] = [];
  for (const w of words(rewrite)) {
    if (w.length < 4 || GRAMMAR.has(w) || out.includes(w)) continue;
    if (knownSet.has(w) || known.some((k) => sameWord(w, k))) continue;
    out.push(w);
  }
  return out;
}
