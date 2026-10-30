/**
 * HOW WELL A RESUME ANSWERS THE POSTING - measured, not guessed.
 *
 * Recruiters and applicant-tracking systems read the document, not the
 * profile behind it. So for each requirement in the posting this checks
 * whether the resume itself shows it, using the requirement's content words
 * (filler like "strong", "experience with" and "end to end" removed, word
 * forms folded: tests/testing/tested).
 *
 * Every requirement lands in one of three states:
 *   - "resume"  : the resume shows it,
 *   - "profile" : the profile has it but this resume doesn't say it yet,
 *   - "missing" : nothing on the profile backs it - a real gap, never filled in.
 *
 * Must-haves count double. Pure and deterministic: runs in the browser as
 * the user edits, and in tests.
 */

import type { TailoredResume } from "@/lib/resume/tailored-resume-core";

export type RequirementState = "resume" | "profile" | "missing";

export interface RequirementMatch {
  text: string;
  required: boolean;
  state: RequirementState;
}

export interface ResumeMatch {
  /** 0-100, must-haves weighted double. */
  score: number;
  items: RequirementMatch[];
  /** Must-haves the resume shows, of all must-haves. */
  mustShown: number;
  mustTotal: number;
}

/** Words that say how much or how well, not what. */
const FILLER = new Set(
  (
    "a an and or the of in on with for to from by at as into across using via plus " +
    "experience experienced exposure expert expertise strong strongly excellent good great solid proven deep " +
    "proficiency proficient knowledge familiarity familiar understanding ability able skill skills skilled " +
    "working work hands hand demonstrated track record background years year plus minimum least " +
    "end similar equivalent related relevant preferably preferred ideally nice bonus must required " +
    "designed analysed analyzed built building build develop developed developing " +
    "is are be being have has etc including include includes like such other others"
  ).split(" "),
);

function stem(word: string): string {
  let w = word.toLowerCase();
  for (const suffix of ["ings", "ing", "ies", "ied", "es", "ed", "s"]) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      if (suffix === "ies" || suffix === "ied") w += "y";
      break;
    }
  }
  // British and American spellings read as one word: analyse/analyze, modelling/modeling.
  return w.replace(/ys(e|ing)?$/, "yz$1").replace(/ll$/, "l");
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\ba\/b\b/g, " abtest ")
    .replace(/[\/\-_.]/g, " ")
    .replace(/[^\p{L}\p{N}+#\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** The words that carry a requirement's meaning: "Expert SQL; strong Python" -> sql, python. */
export function contentStems(requirement: string): string[] {
  const out: string[] = [];
  for (const t of tokens(requirement.replace(/\([^)]*\)/g, " "))) {
    if (FILLER.has(t) || /^\d+\+?$/.test(t)) continue;
    // Two-letter tool names (Go, R, C#) are kept only when they look like one.
    if (t.length < 3 && !/[+#]/.test(t) && t !== "r" && t !== "go" && t !== "ai" && t !== "ml" && t !== "bi") continue;
    const s = stem(t);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function stemSet(text: string): Set<string> {
  return new Set(tokens(text).map(stem));
}

/**
 * Share of a requirement's slots the text fills. Each content word is a
 * slot, except alternatives: "Looker or Tableau" and "a cloud warehouse
 * (BigQuery, Snowflake or Redshift)" are met by any one of the options.
 * Brackets without options ("Python (pandas)") are detail, not a demand.
 */
function slotsOf(requirement: string): string[][][] {
  const slots: string[][][] = [];
  // "a cloud warehouse (BigQuery, Snowflake or Redshift)": the examples
  // stand in for the words right before them, so naming one of them meets
  // "cloud warehouse" too.
  const main = requirement.replace(/((?:[\p{L}\p{N}+#-]+\s+){0,2}[\p{L}\p{N}+#-]+)?\s*\(([^)]*)\)/gu, (_, before: string | undefined, inner: string) => {
    if (/,|\bor\b/i.test(inner)) {
      const alts = inner.split(/,|\bor\b/i).map((a) => contentStems(a)).filter((a) => a.length > 0);
      const generic = before ? contentStems(before) : [];
      if (generic.length) alts.push(generic);
      if (alts.length) slots.push(alts);
      return " ";
    }
    return ` ${before ?? ""} `;
  });
  const options = main.split(/\bor\b/i).map((a) => contentStems(a)).filter((a) => a.length > 0);
  if (options.length > 1) {
    // "Experience with Looker or Tableau": everything before the last
    // option's first word is shared; simplest fair reading is one slot.
    slots.push(options);
  } else if (options.length === 1) {
    for (const s of options[0]) slots.push([[s]]);
  }
  return slots;
}

function coverage(requirement: string, have: Set<string>): number {
  const slots = slotsOf(requirement);
  if (slots.length === 0) return 0;
  const filled = slots.filter((alts) => alts.some((alt) => alt.every((s) => have.has(s)))).length;
  return filled / slots.length;
}

/**
 * Shown when most of it is there. Long requirements carry qualifiers
 * ("... with senior leaders"), so half of four or more words is enough.
 */
function shown(requirement: string, have: Set<string>): boolean {
  const c = coverage(requirement, have);
  return c >= SHOWN || (slotsOf(requirement).length >= 4 && c >= 0.5);
}

/** A requirement is shown when at least 60% of its content words are there. */
const SHOWN = 0.6;

export function matchResume(input: {
  required: string[];
  preferred: string[];
  resumeText: string;
  profileText: string;
}): ResumeMatch {
  const resume = stemSet(input.resumeText);
  const profile = stemSet(`${input.profileText}\n${input.resumeText}`);
  const seen = new Set<string>();
  const items: RequirementMatch[] = [];
  const add = (text: string, required: boolean) => {
    const clean = text.replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key) || slotsOf(clean).length === 0) return;
    seen.add(key);
    const state: RequirementState =
      shown(clean, resume) ? "resume" : shown(clean, profile) ? "profile" : "missing";
    items.push({ text: clean, required, state });
  };
  input.required.slice(0, 16).forEach((r) => add(r, true));
  input.preferred.slice(0, 12).forEach((r) => add(r, false));

  let total = 0;
  let got = 0;
  for (const item of items) {
    const weight = item.required ? 2 : 1;
    total += weight;
    if (item.state === "resume") got += weight;
  }
  const must = items.filter((i) => i.required);
  return {
    score: total === 0 ? 0 : Math.round((got / total) * 100),
    items,
    mustShown: must.filter((i) => i.state === "resume").length,
    mustTotal: must.length,
  };
}

/**
 * The same resume before it was tailored: the chosen lines in the
 * candidate's own words, their profile summary and their skills in profile
 * order. The fair "before" for this job - same content, no rewording.
 */
export function untailoredText(resume: TailoredResume, profile: { summary: string | null; skills: string[] }): string {
  const lines: string[] = [];
  if (profile.summary) lines.push(profile.summary);
  for (const block of [...resume.roles, ...resume.projects]) {
    if ("title" in block) lines.push(`${block.title} ${block.company}`);
    else lines.push(block.name);
    block.bullets.forEach((b, i) => lines.push(block.from?.[i] ?? b));
  }
  lines.push(profile.skills.slice(0, 14).join(", "));
  resume.education.forEach((e) => lines.push(e.line));
  lines.push(...resume.certifications);
  return lines.join("\n");
}

/** Categories a resume can't answer by wording (where you live, your degree). */
const NOT_RESUME_WORDING = /^(education|location|authori[sz]ation|work_authorization|visa|language)$/i;

/** The posting's requirements, split into must-haves and nice-to-haves. */
export function postingRequirements(job: {
  requirements?: { text: string; mandatory?: boolean; category?: string | null }[] | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
}): { required: string[]; preferred: string[] } {
  const items = Array.isArray(job.requirements) ? job.requirements.filter((r) => r?.text && !NOT_RESUME_WORDING.test(r.category ?? "")) : [];
  if (items.length > 0) {
    return {
      required: items.filter((r) => r.mandatory).map((r) => r.text),
      preferred: items.filter((r) => !r.mandatory).map((r) => r.text),
    };
  }
  return { required: job.requiredSkills ?? [], preferred: job.preferredSkills ?? [] };
}
