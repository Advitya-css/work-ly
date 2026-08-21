import type { JobParsingProvider } from "@/lib/ai/job-parser-provider-type";
import type { ExtractedJob } from "@/lib/ai/job-parser-types";
import type { EmploymentType, RequirementItem, SeniorityLevel, WorkMode } from "@/lib/db/types";

/**
 * No-model fallback for job-description parsing: pattern matching over the
 * raw text, no language understanding. Every field it returns is either
 * lifted verbatim from the text or left null - nothing is guessed at.
 * Active whenever no real AI provider is configured (see job-parser.ts),
 * mirroring providers/resume-heuristic.ts.
 */

// Headers are matched as a PREFIX of a short line, not the whole line, so
// real-world variants like "Requirements (must have):" or "Requirements -
// Must Haves" still flip the section instead of falling through to "other"
// (which silently emptied the mandatory/preferred requirement lists).
const MANDATORY_HEADERS = /^(requirements?|qualifications?|must[\s-]?haves?|minimum qualifications?)\b/i;
const PREFERRED_HEADERS =
  /^(preferred|nice[\s-]?to[\s-]?have|bonus points?|pluses?|preferred qualifications?)\b/i;
/**
 * The longest a requirement bullet can be and still be read as naming a
 * skill rather than describing one. 60 was too tight - "Experience with dbt
 * or an equivalent transformation framework" is 61 characters and is
 * unambiguously a skill requirement.
 */
const SKILL_LINE_MAX = 80;

const OTHER_HEADERS = /^(responsibilities|about the role|what you.ll do|description|about (the )?(job|company))\b/i;

// Structured "Label: value" lines (salary, deadline, industry, etc.) are
// already pulled out by their own dedicated extractors below. Without this,
// once a requirements/preferred section is open with no closing header,
// trailing metadata lines like "Salary: $130,000 - $160,000 USD" get
// swept in as bogus requirement bullets.
const LABELED_METADATA_LINE =
  /^(title|position|role|company|employer|organization|location|country|salary|compensation|pay|employment type|work mode|seniority|level|industry|deadline|apply by|date posted|posted|source|url|link)\s*:\s*.+/i;

function splitSections(text: string): { mandatory: string[]; preferred: string[]; other: string[]; all: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const mandatory: string[] = [];
  const preferred: string[] = [];
  const other: string[] = [];
  let current: "mandatory" | "preferred" | "other" = "other";

  for (const line of lines) {
    const bare = line.replace(/[:：]\s*$/, "");
    if (bare.length < 60) {
      if (MANDATORY_HEADERS.test(bare)) {
        current = "mandatory";
        continue;
      }
      if (PREFERRED_HEADERS.test(bare)) {
        current = "preferred";
        continue;
      }
      if (OTHER_HEADERS.test(bare)) {
        current = "other";
        continue;
      }
    }
    if (LABELED_METADATA_LINE.test(line)) continue;
    // Strip a single leading list marker (bullet symbol, or "1." / "2)"
    // numbering) only - not bare leading digits, which are frequently part
    // of the content itself ("5+ years", "24/7 support") and would
    // otherwise get silently truncated.
    const cleaned = line.replace(/^(?:[•\-*●▪◦]\s*|\d+[.)]\s+)/, "").trim();
    if (!cleaned) continue;
    if (current === "mandatory") mandatory.push(cleaned);
    else if (current === "preferred") preferred.push(cleaned);
    else other.push(cleaned);
  }

  return { mandatory, preferred, other, all: lines };
}

/**
 * The part of a requirement bullet that actually names the requirement.
 *
 * Real postings write bullets as sentences - "Expert SQL. You should be
 * comfortable with window functions and CTEs." - and the elaboration after
 * the first full stop is commentary, not a second requirement. Taking the
 * leading sentence and dropping trailing punctuation gives a clean, short
 * requirement name to classify and match on.
 */
function requirementHead(line: string): string {
  const firstSentence = line.split(/(?<=[.!?])\s+/)[0] ?? line;
  return firstSentence.replace(/[.;,:\s]+$/, "").trim();
}

function categorize(line: string): RequirementItem["category"] {
  const lower = line.toLowerCase();
  if (/\b(degree|bachelor|master|phd|b\.?s\.?|m\.?s\.?|diploma)\b/.test(lower)) return "education";
  if (/\b(\d+\+?\s*years?|year[s]? of experience)\b/.test(lower)) return "experience";

  // Previously this required the whole line to be <=60 characters AND to end
  // without sentence punctuation. That second condition threw away almost
  // every real requirement bullet, because postings punctuate their bullets:
  // "Strong Python for analysis (pandas, statistical testing)." was filed as
  // "other" purely for its full stop, so requiredSkills came back empty and
  // the 30-point skills component of every fit score scored zero with the
  // explanation "the posting didn't list specific required skills". Judging
  // the leading sentence instead keeps prose paragraphs out while letting
  // ordinary punctuated bullets through.
  const head = requirementHead(line);
  if (head.length > 1 && head.length <= SKILL_LINE_MAX) return "skill";
  return "other";
}

function toRequirements(lines: string[], mandatory: boolean): RequirementItem[] {
  return lines.slice(0, 25).map((text) => ({ text, mandatory, category: categorize(text) }));
}

function extractSkillNames(lines: string[]): string[] {
  // The post-split cap is deliberately the same SKILL_LINE_MAX that
  // categorize() applies. An earlier, tighter cap here silently dropped
  // single-clause bullets ("Experience with infrastructure as code such as
  // Terraform") that categorize() had already accepted as skills - they
  // stayed in the visible requirements checklist but never reached
  // requiredSkills, so the score and the checklist disagreed.
  const seen = new Set<string>();
  return lines
    .filter((l) => categorize(l) === "skill")
    .map(requirementHead)
    // A parenthetical is an example list, not part of the skill's name, and
    // splitting on its commas produces fragments like "(pandas" and
    // "statistical testing)". Drop the parenthetical, keep the skill.
    .map((l) => l.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim())
    // Split on list separators only. Splitting on "and" as well turned
    // "Hands-on experience designing and interpreting A/B tests" into two
    // meaningless halves; a comma is a list, "and" usually is not.
    .flatMap((l) => l.split(/[,•|]/))
    .map((s) => s.replace(/^[\s.;:-]+|[\s.;:-]+$/g, "").trim())
    .filter((s) => s.length > 1 && s.length <= SKILL_LINE_MAX)
    .filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

function extractTitle(text: string, lines: string[]): string | null {
  const labeled = text.match(/^(?:job\s*title|position|role)\s*:\s*(.+)$/im);
  if (labeled) return labeled[1].trim().slice(0, 150);
  const first = lines[0];
  return first && first.length < 120 ? first : null;
}

function extractCompany(text: string): string | null {
  const labeled = text.match(/^(?:company|employer|organization)\s*:\s*(.+)$/im);
  return labeled ? labeled[1].trim().slice(0, 150) : null;
}

function extractIndustry(text: string): string | null {
  const labeled = text.match(/^(?:industry|sector)\s*:\s*(.+)$/im);
  return labeled ? labeled[1].trim().slice(0, 150) : null;
}

function extractLabeledDate(text: string, label: RegExp): string | null {
  const labeled = text.match(label);
  if (!labeled) return null;
  const raw = labeled[1].trim();
  return Number.isNaN(new Date(raw).getTime()) ? null : raw;
}

function extractLocation(text: string): { location: string | null; country: string | null } {
  const labeled = text.match(/^(?:location)\s*:\s*(.+)$/im);
  return { location: labeled ? labeled[1].trim().slice(0, 150) : null, country: null };
}

const CURRENCY_CODES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "CHF", "JPY", "SGD", "NZD"];

function extractSalary(text: string): { min: number | null; max: number | null; currency: string | null } {
  // An hourly/daily rate ("$60-75/hr", "USD 60-75 per hour") looks identical
  // to an annual range to these regexes - reading it as annual would badly
  // understate a perfectly good contract rate. Safer to report "unknown"
  // than to silently mislabel a rate as a salary.
  if (/per\s*hour|\/\s*hr\b|hourly|per\s*day|\/\s*day\b|daily rate/i.test(text)) {
    return { min: null, max: null, currency: null };
  }

  const parseAmount = (raw: string) => {
    const isK = /k$/i.test(raw);
    const digits = Number(raw.replace(/[k,]/gi, ""));
    return isK ? digits * 1000 : digits;
  };

  // Symbol-prefixed range or single value, e.g. "$130,000 - $160,000" or "$150,000".
  const symbolMatch = text.match(
    /([$€£₹])\s?(\d{2,3}(?:,\d{3})?|\d{1,3}k)(?:\s*(?:-|–|to)\s*([$€£₹]?)\s?(\d{2,3}(?:,\d{3})?|\d{1,3}k))?/i,
  );
  if (symbolMatch) {
    const currencyMap: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" };
    const min = parseAmount(symbolMatch[2]);
    const max = symbolMatch[4] ? parseAmount(symbolMatch[4]) : min;
    return {
      min,
      max,
      currency: currencyMap[symbolMatch[1]] ?? null,
    };
  }

  // Currency-code-prefixed range or single value.
  const codePattern = CURRENCY_CODES.join("|");
  const codeMatch = text.match(
    new RegExp(`\\b(${codePattern})\\s?(\\d{2,3}(?:,\\d{3})?|\\d{1,3}k)(?:\\s*(?:-|–|to)\\s*(?:[A-Z]{3}\\s?)?(\\d{2,3}(?:,\\d{3})?|\\d{1,3}k))?`, "i"),
  );
  if (codeMatch) {
    const min = parseAmount(codeMatch[2]);
    const max = codeMatch[3] ? parseAmount(codeMatch[3]) : min;
    return {
      min,
      max,
      currency: codeMatch[1].toUpperCase(),
    };
  }

  return { min: null, max: null, currency: null };
}

function extractEmploymentType(text: string): EmploymentType | null {
  const lower = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(lower)) return "INTERNSHIP";
  if (/\bfreelance\b/.test(lower)) return "FREELANCE";
  if (/\bcontract(or)?\b/.test(lower)) return "CONTRACT";
  if (/\bpart[\s-]?time\b/.test(lower)) return "PART_TIME";
  if (/\bfull[\s-]?time\b/.test(lower)) return "FULL_TIME";
  return null;
}

function extractWorkMode(text: string): WorkMode | null {
  const lower = text.toLowerCase();
  if (/\bhybrid\b/.test(lower)) return "HYBRID";
  if (/\bremote\b/.test(lower)) return "REMOTE";
  if (/\b(on[\s-]?site|in[\s-]?office|in[\s-]?person)\b/.test(lower)) return "ONSITE";
  return null;
}

// "lead" and "staff" read as job-level adjectives only when they sit next
// to a role noun ("Lead Engineer", "Staff, Software Engineer") or stand
// alone as a title word - never as the common verb ("to lead development",
// "lead a team of five"), which would otherwise false-positive on almost
// any posting that describes ownership or mentorship duties.
const LEAD_LEVEL_PATTERN =
  /\b(lead|staff)\s+(engineer|developer|dev|designer|architect|manager|analyst|scientist|programmer|role|position)\b|\b(engineer|developer|dev|designer|architect|manager|analyst|scientist|programmer)[\s,-]+(lead|staff)\b/i;

function extractSeniority(text: string, title?: string | null): SeniorityLevel | null {
  // A stated title ("Senior Frontend Engineer", "Lead Platform Engineer")
  // is the most reliable signal and is checked first, before scanning the
  // full body - where words like "lead" or "senior" can appear in
  // unrelated sentences (e.g. "lead development", "senior stakeholders").
  for (const source of [title ?? "", text]) {
    const lower = source.toLowerCase();
    if (/\b(vp|vice president|executive|director|head of)\b/.test(lower)) return "EXECUTIVE";
    if (/\bprincipal\b/.test(lower)) return "PRINCIPAL";
    if (LEAD_LEVEL_PATTERN.test(source)) return "LEAD";
    if (/\bsenior\b|\bsr\.?\b/.test(lower)) return "SENIOR";
    if (/\bmid[\s-]?level\b/.test(lower)) return "MID";
    if (/\b(junior|jr\.?)\b/.test(lower)) return "JUNIOR";
    if (/\b(entry[\s-]?level|new grad|graduate)\b/.test(lower)) return "ENTRY";
  }
  return null;
}

function extractExperienceYears(lines: string[]): number | null {
  for (const line of lines) {
    const match = line.match(/(\d+)\+?\s*years?/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function extractEducation(lines: string[]): string | null {
  const line = lines.find((l) => /\b(degree|bachelor|master|phd)\b/i.test(l));
  return line ? line.slice(0, 200) : null;
}

async function run(jobText: string): Promise<ExtractedJob> {
  const sections = splitSections(jobText);
  const { location, country } = extractLocation(jobText);
  const salary = extractSalary(jobText);
  const title = extractTitle(jobText, sections.all);

  return {
    title,
    company: extractCompany(jobText),
    location,
    country,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    employmentType: extractEmploymentType(jobText),
    workMode: extractWorkMode(jobText),
    seniority: extractSeniority(jobText, title),
    description: sections.other.slice(0, 40).join("\n") || null,
    requiredExperienceYears: extractExperienceYears(sections.mandatory),
    preferredExperienceYears: extractExperienceYears(sections.preferred),
    education: extractEducation([...sections.mandatory, ...sections.preferred]),
    industry: extractIndustry(jobText),
    deadline: extractLabeledDate(jobText, /^(?:deadline|apply by|closing date)\s*:\s*(.+)$/im),
    datePosted: extractLabeledDate(jobText, /^(?:date posted|posted(?: on)?|posting date)\s*:\s*(.+)$/im),
    requiredSkills: extractSkillNames(sections.mandatory),
    preferredSkills: extractSkillNames(sections.preferred),
    requirements: [...toRequirements(sections.mandatory, true), ...toRequirements(sections.preferred, false)],
    extractionMethod: "heuristic",
  };
}

export const heuristicJobParsingProvider: JobParsingProvider = {
  name: "heuristic",
  parseJob: run,
};
