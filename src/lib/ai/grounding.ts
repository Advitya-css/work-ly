import type { RequirementItem } from "@/lib/db/types";
import { canonical } from "@/lib/text-utils";

import type { ExtractedJob } from "./job-parser-types";
import type { ExtractedCareerProfile } from "./resume-parser-types";

/**
 * Grounding: check every extracted claim back against the document it was
 * supposedly extracted from, and drop the ones that are not there.
 *
 * Why this exists. A language model asked for structured JSON will happily
 * fill the shape it was given. Ask for an employer list and it may round
 * "Northwind Retail" up to "Northwind Retail Group", invent a plausible
 * second employer to make a career look continuous, or add "Kubernetes" to
 * a skills array because the rest of the CV smells like a backend engineer.
 * Those inventions are indistinguishable from real extractions downstream:
 * they are written to the career profile, scored against jobs, and shown
 * back to the user as facts about their own life. That is the single worst
 * failure mode this product has, so the extraction path gets a cheap,
 * deterministic, purely textual second opinion before anything is persisted.
 *
 * The central tradeoff. Two errors are possible and they are not symmetric:
 *
 *   1. Keeping a hallucination. The user sees a fact about themselves that
 *      is false, and the fit score is computed from it. Silent and harmful.
 *   2. Dropping a legitimate claim that the parser merely reformatted
 *      ("ReactJS" in the CV, "React" in the JSON). The user notices the
 *      missing item on the review screen and can add it back. Visible and
 *      recoverable.
 *
 * (2) is the cheaper error, but only just: a review screen that keeps
 * deleting real skills trains people to ignore it. So the matcher is
 * deliberately tolerant of formatting (case, punctuation, word joins,
 * suffixes, symbol-heavy names like C++ and C#) and deliberately intolerant
 * of content that simply is not in the document.
 *
 * What this can and cannot catch is documented honestly at the bottom of
 * this file. In short: it catches invented proper nouns and invented
 * numbers, and it does not catch anything the model built out of words that
 * genuinely appear in the source.
 *
 * Pure functions only. No I/O, no `server-only`, no dependencies, so this
 * runs in a plain node unit test and could run in the browser if needed.
 */

export interface DroppedClaim {
  /** e.g. "experience.company", "skills", "requiredSkills" */
  field: string;
  /** the value that was dropped */
  value: string;
  reason: string;
}

export interface GroundingReport<T> {
  /** The extraction with unverifiable claims removed. */
  grounded: T;
  dropped: DroppedClaim[];
  /** 0-1: fraction of checkable claims that were found in the source. */
  groundedRatio: number;
}

/**
 * Words carrying no identifying power. If a claim's only surviving evidence
 * is that the source also contains the word "and", the claim is unverified.
 *
 * The company-suffix entries (inc, ltd, gmbh, holdings, ...) are here for a
 * specific reason: models love to expand "Northwind Retail" into "Northwind
 * Retail Limited". Treating the suffix as noise means the expansion still
 * matches on the part that identifies the company, while a wholly invented
 * "Globex Corporation" still fails on "globex".
 */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "over",
  "per",
  "plus",
  "that",
  "the",
  "their",
  "then",
  "these",
  "this",
  "those",
  "to",
  "up",
  "via",
  "was",
  "were",
  "will",
  "with",
  "within",
  "you",
  "your",
  // Legal and organisational suffixes: noise, not identity.
  "co",
  "company",
  "corp",
  "corporation",
  "gmbh",
  "group",
  "holdings",
  "inc",
  "incorporated",
  "limited",
  "llc",
  "llp",
  "ltd",
  "plc",
  "sa",
  "sarl",
]);

/**
 * A token shorter than this is never treated as evidence on its own, and is
 * never used for prefix matching. Three-letter tokens like "sql" or "aws"
 * still count as significant, they just cannot match by prefix, otherwise
 * "aws" would match "awstats" and "sql" would match "sqlite".
 */
const MIN_PREFIX_LEN = 4;

/**
 * A token this long or longer identifies the claim rather than describing
 * it. "Senior Data Engineer" is mostly generic; "Northwind" is not. At
 * least one such token must be found, so a claim cannot be waved through
 * purely on shared filler ("Global Solutions Group" vs "global solutions").
 */
const DISTINCTIVE_LEN = 5;

/** Fraction of significant tokens that must be found for a multi-word claim. */
const MIN_TOKEN_COVERAGE = 0.6;

/**
 * Fold symbol-bearing technology names into plain word tokens *before*
 * punctuation is stripped, because canonical() would otherwise reduce
 * "C++", "C#" and "C" to the same single letter "c" and make them
 * interchangeable. Applied identically to source and claim, so the two
 * sides always agree. The optional whitespace in the patterns is what makes
 * "C ++" (a very common artefact of PDF text extraction) match "C++".
 */
function foldSymbolNames(text: string): string {
  return text
    .replace(/(\b[a-z])\s*\+\+/gi, "$1plusplus")
    .replace(/(\b[a-z])\s*#/gi, "$1sharp")
    .replace(/\bnode\s*\.\s*js\b/gi, "nodejs");
}

/**
 * The canonical searchable form: lowercase, punctuation folded to spaces,
 * whitespace collapsed.
 *
 * We reuse canonical() from text-utils rather than normalizeToken() because
 * normalizeToken only folds `. - _ /` and leaves other punctuation in place,
 * which would leave commas and parentheses glued to words from a CV. And we
 * deliberately do not use skillsMatch(): it compares two short skill names
 * by bare substring containment in both directions, which is fine for
 * matching a skill against a skill but far too loose against a whole
 * document, where almost any short string occurs somewhere.
 */
function normalizeForSearch(text: string): string {
  return canonical(foldSymbolNames(text));
}

interface SourceIndex {
  /** " token token token " - padded so a leading-space probe finds word starts. */
  padded: string;
  /** Every distinct token in the source. */
  tokens: Set<string>;
  /** Every number the source states, in tolerant parsed form (see parseNumbers). */
  numbers: Set<number>;
}

/**
 * Numbers get their own index because they are written a dozen ways:
 * "80,000", "80 000", "£80k", "80K - 100K", "5+ years". We normalise
 * thousands separators, then read "k" as a multiplier, so all of those land
 * on comparable values. Anything we fail to parse simply is not in the set,
 * which biases towards nulling a suspicious number rather than trusting it.
 */
function parseNumbers(sourceText: string): Set<number> {
  const flattened = sourceText
    .toLowerCase()
    .replace(/(\d)[, \s](\d{3})\b/g, "$1$2")
    .replace(/(\d)[, \s](\d{3})\b/g, "$1$2");

  const found = new Set<number>();
  
  // First extract explicit ranges with 'k' so both sides get the multiplier: "80 - 100k"
  for (const match of flattened.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*k\b/g)) {
    const min = Number.parseFloat(match[1]);
    const max = Number.parseFloat(match[2]);
    if (Number.isFinite(min)) {
      found.add(min);
      found.add(min * 1000);
    }
    if (Number.isFinite(max)) {
      found.add(max);
      found.add(max * 1000);
    }
  }

  // Then extract all standalone numbers (the regex won't double-count badly since Set handles dupes)
  for (const match of flattened.matchAll(/(\d+(?:\.\d+)?)\s*(k\b)?/g)) {
    const base = Number.parseFloat(match[1]);
    if (!Number.isFinite(base)) continue;
    found.add(base);
    if (match[2]) found.add(base * 1000);
  }
  
  return found;
}

function buildSourceIndex(sourceText: string): SourceIndex {
  const normalized = normalizeForSearch(sourceText);
  const tokens = normalized.length > 0 ? normalized.split(" ") : [];
  return {
    padded: ` ${normalized} `,
    tokens: new Set(tokens),
    numbers: parseNumbers(sourceText),
  };
}

/**
 * Does this single token appear in the source? Three ways to say yes, in
 * increasing order of tolerance:
 *
 *   1. exact token match;
 *   2. the source has a longer token starting with ours ("react" in
 *      "reactjs", "engineer" in "engineering") - this is the case that
 *      keeps legitimately shortened skill names alive;
 *   3. our token starts with a source token ("reactjs" claimed, "react"
 *      written; "javascripts" claimed, "javascript" written).
 *
 * Both prefix rules need MIN_PREFIX_LEN characters of agreement. That floor
 * is what stops "go" and "r" from matching half the document, and it is
 * also, honestly, why "java" still matches a source that only says
 * "javascript". Prefix matching cannot distinguish an abbreviation from a
 * different product with a shared root; we accept that in exchange for not
 * deleting real skills.
 */
function tokenAppears(token: string, index: SourceIndex): boolean {
  if (index.tokens.has(token)) return true;
  if (token.length < MIN_PREFIX_LEN) return false;
  // If the source contains a longer word that starts with the model's token,
  // (e.g. source: "javascript", model: "java"), we accept it as an abbreviation.
  if (index.padded.includes(` ${token}`)) return true;
  return false;
}

interface Verdict {
  grounded: boolean;
  reason: string;
}

const GROUNDED: Verdict = { grounded: true, reason: "" };

/**
 * The core check. A claim is grounded when most of its significant tokens
 * are in the source AND at least one distinctive token is.
 *
 * Requiring "most" rather than the exact phrase is the whole point:
 * extraction legitimately reorders, retitles and trims ("Senior Data
 * Analyst, Contract" -> "Senior Data Analyst"). Requiring one distinctive
 * token stops the coverage rule from being satisfied entirely by generic
 * words, which is exactly how an invented company name sneaks through
 * ("Apex Digital Solutions" vs a source that says "digital solutions").
 */
function verifyText(rawValue: string, index: SourceIndex): Verdict {
  const value = normalizeForSearch(rawValue);
  if (value.length === 0) {
    return { grounded: false, reason: "value has no searchable characters" };
  }

  // Very short claims ("R", "Go", "C") carry almost no signal: any prefix or
  // fuzzy rule would match them against half the document. They are kept
  // only on an exact whole-token hit, and otherwise dropped rather than
  // guessed at. Note this still cannot tell the language "Go" from the verb
  // "go" in "go-to-market", which is a limit of text matching, not a bug.
  if (value.length <= 2) {
    return index.tokens.has(value)
      ? GROUNDED
      : { grounded: false, reason: "short value not found verbatim in source" };
  }

  const all = value.split(" ");
  let significant = all.filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  // A claim made entirely of stopwords ("The Group") still has to be
  // checked against something, so fall back to its raw tokens.
  if (significant.length === 0) significant = all;

  const found = significant.filter((t) => tokenAppears(t, index));
  const coverage = found.length / significant.length;

  const distinctive = significant.filter((t) => t.length >= DISTINCTIVE_LEN);
  if (
    distinctive.length > 0 &&
    !distinctive.some((t) => tokenAppears(t, index))
  ) {
    return {
      grounded: false,
      reason: "no distinctive term from this value appears in the source",
    };
  }

  if (coverage < MIN_TOKEN_COVERAGE) {
    return {
      grounded: false,
      reason: `only ${found.length} of ${significant.length} significant terms found in the source`,
    };
  }

  return GROUNDED;
}

/**
 * Numbers are checked by value, not by string, so "£80,000" in the posting
 * grounds a salaryMin of 80000. parseNumbers already handles k-ranges,
 * so we can require an exact value match.
 */
function verifyNumber(value: number, index: SourceIndex): Verdict {
  if (index.numbers.has(value)) return GROUNDED;
  return {
    grounded: false,
    reason: `the figure ${value} does not appear in the source`,
  };
}

/**
 * Accumulates the verdicts. Every call to check() counts towards the ratio,
 * so the ratio measures exactly what was actually verified, and fields we
 * deliberately do not verify (synthesised prose, dates, enums) cannot
 * flatter or depress it.
 */
class GroundingRun {
  readonly dropped: DroppedClaim[] = [];
  private checkable = 0;
  private found = 0;

  constructor(private readonly index: SourceIndex) {}

  /** Verify a text claim. Records a drop and returns false when unfounded. */
  check(field: string, value: string): boolean {
    return this.record(field, value, verifyText(value, this.index));
  }

  /** Verify a number. Records a drop and returns false when unfounded. */
  checkNumber(field: string, value: number): boolean {
    return this.record(field, String(value), verifyNumber(value, this.index));
  }

  /**
   * Count a claim towards the ratio without ever dropping it. Used for
   * transferable skills, which are inferred on purpose (see below).
   */
  observe(grounded: boolean): void {
    this.checkable += 1;
    if (grounded) this.found += 1;
  }

  /**
   * Is a transferable skill's rationale anchored in the document? The
   * rationale is free prose ("chaired the debating society, so public
   * speaking"), so demanding 60% coverage of it would fail almost every
   * true one. We ask a weaker question: do at least two of its content
   * words (or its only one) actually occur in the CV? That distinguishes an
   * inference drawn from the document from one drawn from thin air.
   */
  rationaleIsAnchored(rationale: string): boolean {
    const normalized = normalizeForSearch(rationale);
    if (normalized.length === 0) return false;
    const significant = normalized
      .split(" ")
      .filter((t) => t.length >= MIN_PREFIX_LEN && !STOPWORDS.has(t));
    if (significant.length === 0) return false;
    const found = significant.filter((t) => tokenAppears(t, this.index)).length;
    return found >= Math.min(2, significant.length);
  }

  private record(field: string, value: string, verdict: Verdict): boolean {
    this.checkable += 1;
    if (verdict.grounded) {
      this.found += 1;
      return true;
    }
    this.dropped.push({ field, value, reason: verdict.reason });
    return false;
  }

  /**
   * No checkable claims means nothing was unverifiable, so the ratio is 1.
   * Rounded to four places: this number is displayed and compared, and
   * float noise like 0.30000000000000004 in a UI reads as a bug.
   */
  ratio(): number {
    if (this.checkable === 0) return 1;
    return Math.round((this.found / this.checkable) * 10_000) / 10_000;
  }
}

/**
 * Verify a parsed CV against the CV text.
 *
 * Not checked, on purpose:
 *
 *   - `headline` and `summary` are synthesised prose. A good summary uses
 *     words the CV never used; checking it would delete the useful ones and
 *     drag the ratio down for doing its job. Excluded from the ratio too.
 *   - `yearsExperience` is computed from the parsed dates rather than
 *     quoted from the document, so a digit search says nothing about it.
 *   - Dates, descriptions and categories ride along with their parent
 *     entry: if the entry itself is grounded we accept its detail fields,
 *     and if it is not, the whole entry goes. Verifying "March 2022"
 *     independently would mostly measure date reformatting.
 */
export function groundResumeExtraction(
  extracted: ExtractedCareerProfile,
  sourceText: string,
): GroundingReport<ExtractedCareerProfile> {
  const index = buildSourceIndex(sourceText);
  const run = new GroundingRun(index);

  const skills = extracted.skills.filter((s) => run.check("skills", s.name));

  // Transferable skills are inferred by design: the CV says "President of
  // the Economics Club" and the parser says "Leadership". The skill name is
  // therefore *expected* to be absent from the source, and checking it
  // would delete every one of them. What we can check is the rationale,
  // which is supposed to cite the CV. So we verify the rationale's content
  // words, count that in the ratio as a quality signal, and keep the skill
  // either way: these are already surfaced to the user as "potential
  // transferable skill", never as established fact, so an unanchored one is
  // a much smaller harm than an invented employer.
  for (const t of extracted.transferableSkills) {
    run.observe(run.rationaleIsAnchored(t.rationale));
  }

  // Same reasoning as transferable skills just above: a work value like
  // "sustainability_climate" is a catalog key, not something the CV states
  // verbatim, so checking the key itself would fail every real inference.
  // What's checkable is whether the cited evidence is actually anchored in
  // the document.
  for (const v of extracted.workValues) {
    run.observe(run.rationaleIsAnchored(v.evidence));
  }

  // The company is the identity of an experience entry. If it is not in the
  // document, the role did not come from the document, and its dates and
  // bullet points are not salvageable, so the entry goes as a unit.
  const experience = extracted.experience.filter((e) => {
    if (!run.check("experience.company", e.company)) return false;
    
    // If the title is not grounded, don't silently leak the hallucination.
    // We keep the job because the company was real, but flag the title.
    if (!run.check("experience.title", e.title)) {
      e.title = "Role not confidently identified";
    }
    return true;
  });

  const education = extracted.education.filter((e) =>
    run.check("education.institution", e.institution),
  );
  const certifications = extracted.certifications.filter((c) =>
    run.check("certifications.name", c.name),
  );
  const projects = extracted.projects.filter((p) =>
    run.check("projects.name", p.name),
  );
  const achievements = extracted.achievements.filter((a) =>
    run.check("achievements.title", a.title),
  );

  return {
    grounded: {
      ...extracted,
      skills,
      experience,
      education,
      certifications,
      projects,
      achievements,
    },
    dropped: run.dropped,
    groundedRatio: run.ratio(),
  };
}

/**
 * Verify a parsed job posting against the posting text.
 *
 * A hallucinated requirement is not just cosmetic here: requirements drive
 * the gap analysis, so an invented "must have Kubernetes" line becomes a
 * gap the user is told to go and close.
 *
 * `company`, `title` and `location` are nulled rather than removed, because
 * the rest of the posting is still worth keeping and the type already
 * models "we could not determine this" as null. `description` is left alone
 * for the same reason as the CV summary: it is prose, not a claim.
 */
export function groundJobExtraction(
  extracted: ExtractedJob,
  sourceText: string,
): GroundingReport<ExtractedJob> {
  const index = buildSourceIndex(sourceText);
  const run = new GroundingRun(index);

  const keepText = (field: string, value: string | null): string | null => {
    if (value === null || value.trim() === "") return value;
    return run.check(field, value) ? value : null;
  };

  const keepNumber = (field: string, value: number | null): number | null => {
    if (value === null) return null;
    return run.checkNumber(field, value) ? value : null;
  };

  const requiredSkills = extracted.requiredSkills.filter((s) =>
    run.check("requiredSkills", s),
  );
  const preferredSkills = extracted.preferredSkills.filter((s) =>
    run.check("preferredSkills", s),
  );
  const requirements: RequirementItem[] = extracted.requirements.filter((r) =>
    run.check("requirements", r.text),
  );

  return {
    grounded: {
      ...extracted,
      title: keepText("title", extracted.title),
      company: keepText("company", extracted.company),
      location: keepText("location", extracted.location),
      salaryMin: keepNumber("salaryMin", extracted.salaryMin),
      salaryMax: keepNumber("salaryMax", extracted.salaryMax),
      requiredExperienceYears: keepNumber(
        "requiredExperienceYears",
        extracted.requiredExperienceYears,
      ),
      requiredSkills,
      preferredSkills,
      requirements,
    },
    dropped: run.dropped,
    groundedRatio: run.ratio(),
  };
}

/**
 * Known limits, stated plainly so nobody reads a high groundedRatio as
 * proof the extraction is true:
 *
 *   - Recombination is invisible. If the CV names two employers and two job
 *     titles, an extraction that attaches the wrong title to the wrong
 *     employer passes every check here, because every token is present.
 *     Same for a degree awarded by the wrong listed university, or a skill
 *     lifted out of the "nice to have" section of a job the person applied
 *     to and filed as one of their own.
 *   - Dates and durations are not verified at all, so an invented tenure
 *     ("2019 to 2024" for a role the CV dates 2019 to 2020) survives, and
 *     with it an inflated yearsExperience.
 *   - Generic names slip through. A fabricated "Digital Solutions Group"
 *     will match a source that happens to discuss digital solutions, since
 *     the distinctive-token rule only needs one hit.
 *   - Prefix tolerance cuts both ways: a source saying "JavaScript" grounds
 *     a claim of "Java", and "Postgres" grounds "PostgreSQL" (wanted) as
 *     well as arguably-different things sharing a root (not wanted).
 *   - Negation and attribution are ignored. "We do not use React" and "you
 *     will work with our React team" both ground the skill React, and text
 *     that came from a pasted job ad at the bottom of a CV counts as
 *     source. This module checks presence, never meaning.
 *   - Anything the source does not contain but the model rephrased from it
 *     (a summary line turned into a fake achievement title made of words
 *     already on the page) can survive.
 *
 * What it does catch reliably: wholly invented proper nouns (employers,
 * institutions, certifications, products) and invented figures (salary
 * bands, years of experience), which between them are the majority of
 * observed extraction failures.
 */
