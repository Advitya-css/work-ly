import type { ResumeParsingProvider } from "@/lib/ai/resume-parser-provider-type";
import type {
  ExtractedAchievement,
  ExtractedCareerProfile,
  ExtractedCertification,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedSkill,
  ExtractedWorkValue,
} from "@/lib/ai/resume-parser-types";
import type { SkillCategory } from "@/lib/db/types";
import { detectValues } from "@/lib/values/value-graph";

/**
 * No-model fallback: splits resume text into sections by common headers
 * and does line-level best-effort extraction. This is intentionally
 * simple pattern matching, not language understanding - every single
 * entry it produces is marked `isUncertain: true` so the review screen
 * makes clear none of this has been verified. Active whenever no real AI
 * provider is configured (see resume-parser.ts), so CV upload is testable
 * and useful without an API key, without ever pretending to be AI.
 */

const SECTION_HEADERS: Record<string, RegExp> = {
  education: /^(?:academic\s+)?educa\s*tion/i,
  experience: /^(?:professional|work|relevant|career|employment)?\s*(?:experience|history|employment|background)/i,
  projects: /^(?:key\s+|recent\s+|personal\s+)?projects?$/i,
  skills: /^(?:technical|core|key|professional|relevant)?\s*skills|areas\s+of\s+expertise|technical\s+(?:proficiencies|competencies)/i,
  certifications: /^certifications?|licenses?/i,
  achievements: /^(?:key\s+)?(?:achievements?|awards?|honou?rs?)/i,
  languages: /^languages?$/i,
};

type SectionName = keyof typeof SECTION_HEADERS;

function splitIntoSections(text: string): { sections: Partial<Record<SectionName, string[]>>; headerLines: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Partial<Record<SectionName, string[]>> = {};
  const headerLines: string[] = [];
  let current: SectionName | null = null;

  for (const line of lines) {
    const bare = line.replace(/[:：]\s*$/, "").replace(/^[*#_-]+\s*/, "").replace(/[*_]+$/, "").replace(/\s+/g, " ");
    const matchedSection = (Object.keys(SECTION_HEADERS) as SectionName[]).find((name) =>
      SECTION_HEADERS[name].test(bare),
    );
    if (matchedSection) {
      const match = bare.match(SECTION_HEADERS[matchedSection]);
      const headerLength = match ? match[0].length : bare.length;
      const remainder = bare.slice(headerLength).replace(/^[\s:–—|-]+/, "").trim();

      if (bare.length < 50 || remainder.length > 0) {
        current = matchedSection;
        sections[current] ??= [];
        if (remainder.length > 0) {
          sections[current]!.push(remainder);
        }
        continue;
      }
    }
    if (current) {
      sections[current]!.push(line.replace(/^[*_]+|[*_]+$/g, ""));
    } else {
      headerLines.push(line);
    }
  }

  return { sections, headerLines };
}

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(" ");
}

const BULLET = /^[-•*●▪◦·]\s*/;

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

/** One end of a range: "March 2022", "03/2022", "3-2022", "Mar '22", "2019". */
const DATE_TOKEN = `(?:(?:${MONTHS})\\.?\\s+)?(?:\\d{1,2}[/.-])?\\s*(?:\\d{4}|'?\\d{2})`;

/** "March 2022 - Present", "July 2019 – February 2022", "2019 to 2022", "03/2022 - 06/2024". */
const DATE_RANGE = new RegExp(
  `^\\s*(${DATE_TOKEN})\\s*(?:[-–,]|to)\\s*(present|current|now|${DATE_TOKEN})\\s*$`,
  "i",
);

/** Dates placed inline at the end of a title/company line, e.g. "Tech Lead | Finova Solutions Jan 2023 – Present" */
const INLINE_DATE_RANGE = new RegExp(
  `[|\\s–—,-]+(${DATE_TOKEN})\\s*(?:[-–—,]|to)\\s*(present|current|now|${DATE_TOKEN})\\s*$`,
  "i",
);

const SINGLE_DATE = new RegExp(
  `^\\s*(?:graduated|completed|class of)?\\s*(${DATE_TOKEN})\\s*$`,
  "i",
);

function expandYear(y: string): string {
  y = y.replace("'", "");
  if (y.length === 4) return y;
  const num = parseInt(y, 10);
  // Assume '00-'50 is 2000s, '51-'99 is 1900s
  return num > 50 ? `19${num}` : `20${String(num).padStart(2, "0")}`;
}

/**
 * Turns "March 2022" / "2019" / "03/2022" / "Mar '22" into an ISO date string, or null.
 * Day precision is never claimed - everything lands on the 1st, because a CV
 * almost never states a day and inventing one would be a fabricated fact.
 */
function toIsoDate(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (/^(present|current|now)$/i.test(value)) return null;

  const monthYear = value.match(new RegExp(`^(${MONTHS})\\.?\\s+('?\\d{2}|\\d{4})$`, "i"));
  if (monthYear) {
    const index = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ].indexOf(monthYear[1].slice(0, 3).toLowerCase());
    if (index >= 0) return `${expandYear(monthYear[2])}-${String(index + 1).padStart(2, "0")}-01`;
  }

  const numeric = value.match(/^(\d{1,2})[/.-]('?\d{2}|\d{4})$/);
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return `${expandYear(numeric[2])}-${String(month).padStart(2, "0")}-01`;
  }

  const yearOnly = value.match(/^('?\d{2}|\d{4})$/);
  if (yearOnly) return `${expandYear(yearOnly[1])}-01-01`;

  return null;
}

interface Block {
  header: string;
  dates: { start: string | null; end: string | null; isCurrent: boolean } | null;
  detail: string[];
}

function isNewEntry(line: string, nextLine?: string): boolean {
  if (line.match(INLINE_DATE_RANGE)) return true;
  if (nextLine && nextLine.match(DATE_RANGE)) return true;
  const hasSplit = /\s+[-–|]\s+|\s+\bat\b\s+/i.test(line);
  const words = line.split(/\s+/);
  if (hasSplit && words.length <= 8 && !/[.,;]$/.test(line)) return true;
  return false;
}

/**
 * Groups a section's lines into one block per entry.
 *
 * Bullets and date lines are continuations of the entry above them, not new entries.
 */
function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const isBullet = BULLET.test(line);
    const dateMatch = line.match(DATE_RANGE) || line.match(SINGLE_DATE);
    const current = blocks[blocks.length - 1];

    if ((isBullet || dateMatch) && current) {
      if (dateMatch && !current.dates) {
        const startRaw = dateMatch[1];
        const endRaw = dateMatch[2] ?? dateMatch[1];
        current.dates = {
          start: toIsoDate(startRaw),
          end: toIsoDate(endRaw),
          isCurrent: /^(present|current|now)$/i.test(endRaw.trim()),
        };
      } else {
        current.detail.push(line.replace(BULLET, "").trim());
      }
      continue;
    }

    if (current && !isNewEntry(line, nextLine)) {
      current.detail.push(line.replace(BULLET, "").trim());
      continue;
    }

    // Check if the header line itself carries inline date range at the end
    const inlineDateMatch = line.match(INLINE_DATE_RANGE);
    if (inlineDateMatch) {
      const headerWithoutDates = line.slice(0, inlineDateMatch.index).trim().replace(/[|–—,-]+$/, "").trim();
      const endRaw = inlineDateMatch[2];
      blocks.push({
        header: headerWithoutDates || line,
        dates: {
          start: toIsoDate(inlineDateMatch[1]),
          end: toIsoDate(endRaw),
          isCurrent: /^(present|current|now)$/i.test(endRaw.trim()),
        },
        detail: [],
      });
      continue;
    }

    blocks.push({ header: line, dates: null, detail: [] });
  }

  return blocks;
}

/** Splits "Product Analyst - Northwind Retail, London" into its parts. */
function splitHeader(header: string): { title: string | null; company: string; location?: string } {
  const parts = header
    .split(/\s+[-–, |]\s+|\s+\bat\b\s+/i)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const [title, rest] = parts;
    const segments = rest.split(",").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    return {
      title,
      company: segments[0] ?? rest,
      location: segments.length > 1 ? segments.slice(1).join(", ") : undefined,
    };
  }

  // No separator to work with. Report the line as the company and say plainly
  // that the role could not be read, rather than guessing at a job title.
  return { title: null, company: firstNWords(header.replace(/\s+/g, " "), 8) };
}

function extractEducation(lines: string[]): ExtractedEducation[] {
  return groupBlocks(lines)
    .slice(0, 10)
    .map((block) => {
      let startDate = block.dates?.start ?? undefined;
      let endDate = block.dates?.end ?? undefined;
      if (!endDate) {
        for (const d of block.detail) {
          const singleDate = d.match(SINGLE_DATE);
          if (singleDate) {
            endDate = toIsoDate(singleDate[1]) ?? undefined;
            break;
          }
        }
      }

      const cleanHeader = block.header.replace(/[|–—,-]+$/, "").trim();
      const degreeMatch = cleanHeader.match(
        /^(?:Bachelor|Master|Doctor|PhD|B\.S\.|B\.A\.|M\.S\.|M\.A\.|Associate)(?:'s)?(?:\s+of\s+[A-Za-z\s]+?(?=\s+(?:University|College|Institute|School|at\b)|$))?/i,
      );

      let institution = "";
      let degree: string | undefined = undefined;

      if (degreeMatch && degreeMatch[0].length < cleanHeader.length) {
        degree = degreeMatch[0].replace(/\s+/g, " ").trim();
        institution = cleanHeader.slice(degreeMatch[0].length).replace(/^[\s,–—|]+/, "").replace(/\s+/g, " ").trim();
      } else {
        const segments = cleanHeader.split(/[,|–—]/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
        const institutionIndex = segments.findIndex((s) =>
          /university|college|school|institute|academy|polytechnic/i.test(s),
        );
        institution =
          institutionIndex >= 0 ? segments[institutionIndex] : firstNWords(cleanHeader.replace(/\s+/g, " "), 8);
        degree =
          institutionIndex > 0
            ? segments[0]
            : institutionIndex === 0 && segments.length > 1
              ? segments[1]
              : undefined;
      }

      return {
        institution,
        degree,
        startDate,
        endDate,
        description: [cleanHeader, ...block.detail].join(", ").slice(0, 500),
        isUncertain: true,
      };
    });
}

function extractExperience(lines: string[]): ExtractedExperience[] {
  return groupBlocks(lines)
    .slice(0, 10)
    .map((block) => {
      const { title, company, location } = splitHeader(block.header);
      return {
        company,
        title: title ?? "Role not confidently identified",
        location,
        startDate: block.dates?.start ?? undefined,
        endDate: block.dates?.end ?? undefined,
        isCurrent: block.dates?.isCurrent ?? undefined,
        description: block.detail.join("\n").slice(0, 2000) || block.header,
        isUncertain: true,
      };
    });
}

/**
 * Years of experience implied by the dated roles, or null when the CV's dates
 * could not be read. Null matters: the scorer reads a missing value as
 * "unknown", while 0 would state as fact that the candidate has never worked.
 *
 * Overlapping roles are merged rather than added, so a promotion listed as
 * two entries does not double-count.
 */
function estimateYears(experiences: ExtractedExperience[]): number | null {
  const spans = experiences
    .filter((e) => e.startDate)
    .map((e) => ({
      start: new Date(e.startDate!).getTime(),
      end: e.isCurrent || !e.endDate ? Date.now() : new Date(e.endDate).getTime(),
    }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  if (spans.length === 0) return null;

  const merged: { start: number; end: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }

  const totalMs = merged.reduce((sum, s) => sum + (s.end - s.start), 0);
  const years = Math.round(totalMs / (1000 * 60 * 60 * 24 * 365.25));
  return years > 0 ? Math.min(years, 60) : null;
}

function extractProjects(lines: string[]): ExtractedProject[] {
  return lines.slice(0, 10).map((line) => ({
    name: firstNWords(line, 6),
    description: line,
    isUncertain: true,
  }));
}

function extractSkills(lines: string[], category: SkillCategory): ExtractedSkill[] {
  const joined = lines.join(", ");
  return joined
    .split(/(?:,(?![^()]*\))|[•|])/)
    .map((s) => s.replace(/^[A-Za-z\s&]+:\s*/, "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 40)
    .map((name) => ({
      name,
      category,
      evidenceLevel: "STATED" as const,
      isUncertain: true,
    }));
}

function extractCertifications(lines: string[]): ExtractedCertification[] {
  return lines.slice(0, 10).map((line) => ({
    name: firstNWords(line, 10),
    isUncertain: true,
  }));
}

function extractAchievements(lines: string[]): ExtractedAchievement[] {
  return lines.slice(0, 10).map((line) => ({
    title: firstNWords(line, 12),
    description: line,
    isUncertain: true,
  }));
}

/**
 * No AI available here, so there is no real interpretation of what the
 * candidate's history *implies* about their values - only whether the
 * resume text literally uses value-signaling language (a candidate who
 * worked at climate-tech companies without ever writing the word
 * "climate" or "sustainability" gets nothing from this path; that's the
 * honest limit of pattern matching, not a bug to work around here). Every
 * confidence is capped well below what the real AI parser would give for
 * equivalent evidence, specifically so the heuristic path can never look
 * as confident as the real inference it stands in for.
 */
function extractWorkValues(resumeText: string): ExtractedWorkValue[] {
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return detectValues(resumeText)
    .slice(0, 3)
    .map(({ value, hits }) => {
      const evidenceLine = lines.find((line) => line.toLowerCase().includes(hits[0])) ?? hits[0];
      return {
        value: value.key,
        confidence: Math.min(0.3 + hits.length * 0.1, 0.6),
        evidence: `Resume mentions "${hits[0]}"${evidenceLine !== hits[0] ? `: "${firstNWords(evidenceLine, 16)}"` : ""}.`,
      };
    });
}

/**
 * Best-effort current location, read straight off the page - never
 * inferred. Two patterns, tried in order:
 *
 *   1. An explicit label ("Location: Austin, TX", "Based in: Remote")
 *      anywhere in the document - the strongest signal, since the
 *      candidate said it outright.
 *   2. The header block most resumes open with (name, email, phone, city),
 *      where a short two-part "City, ST" / "City, Country" line commonly
 *      sits on its own. Deliberately narrow: skip anything with an "@"
 *      (email), a digit (phone number, postal code), or a URL, and require
 *      exactly one comma, so a job title or a sentence can't be mistaken
 *      for a place.
 *
 * Returns undefined - never a guess - when neither pattern is found.
 */
function extractLocationHint(resumeText: string): string | undefined {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const labeled = line.match(/^(?:location|based in|city)\s*[:\-]\s*(.+)$/i);
    const value = labeled?.[1]?.trim();
    if (value && value.length > 0 && value.length < 60) {
      return value;
    }
  }

  for (const line of lines.slice(0, 8)) {
    if (line.includes("@") || /https?:\/\//i.test(line)) continue;
    const cleanLine = line.replace(/\s*\([^)]*\)/g, "").replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim();
    if (/\d/.test(cleanLine)) continue;
    const parts = cleanLine.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2) continue;
    const [city, region] = parts;
    const looksLikePlace = (s: string) => s.length >= 2 && s.length <= 30 && /^[A-Za-z][A-Za-z.\s'-]*$/.test(s);
    if (looksLikePlace(city) && looksLikePlace(region)) {
      return `${city}, ${region}`;
    }
  }

  return undefined;
}

function extractHeadlineAndSummary(headerLines: string[]): { headline?: string; summary?: string } {
  const candidates: string[] = [];
  for (const line of headerLines) {
    const trimmed = line.replace(/^[|•\s-]+|[|•\s-]+$/g, "").trim();
    if (!trimmed) continue;
    if (/@|https?:\/\/|www\.|\.com\b|\.io\b|\.org\b|\.dev\b/i.test(trimmed)) continue;
    if (/\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmed)) continue;
    if (/^(?:location|based in|city)\s*[:\-]/i.test(trimmed)) continue;
    const parts = trimmed.split(",").map((p) => p.trim());
    if (
      parts.length === 2 &&
      /^[A-Za-z\s]+$/.test(parts[0]) &&
      /^[A-Za-z\s]+$/.test(parts[1].replace(/\([^)]*\)/g, "").trim())
    ) {
      continue;
    }

    if (candidates.length === 0 && trimmed.split(/\s+/).length <= 4 && /^[A-Za-z\s.'-]+$/.test(trimmed)) {
      continue;
    }
    candidates.push(trimmed.replace(/\s+/g, " "));
  }

  let headline: string | undefined;
  const summaryParts: string[] = [];

  for (const c of candidates) {
    if (!headline && c.length >= 4 && c.length <= 80 && !/[.!?]$/.test(c)) {
      headline = c;
    } else {
      summaryParts.push(c);
    }
  }

  return { headline, summary: summaryParts.join(" ") || undefined };
}

// A real resume is never anywhere near this long; capping input before the
// line-by-line regex matching below runs bounds the worst case regardless
// of any individual pattern's own behavior on pathological input.
const MAX_HEURISTIC_CHARS = 30_000;

async function run(resumeText: string): Promise<ExtractedCareerProfile> {
  const truncated = resumeText.slice(0, MAX_HEURISTIC_CHARS);
  const { sections, headerLines } = splitIntoSections(truncated);

  const skills = [
    ...extractSkills(sections.skills ?? [], "TECHNICAL"),
    ...extractSkills(sections.languages ?? [], "LANGUAGE"),
  ];

  const experience = extractExperience(sections.experience ?? []);
  const { headline, summary } = extractHeadlineAndSummary(headerLines);

  return {
    headline,
    summary,
    location: extractLocationHint(truncated),
    yearsExperience: estimateYears(experience),
    education: extractEducation(sections.education ?? []),
    experience,
    projects: extractProjects(sections.projects ?? []),
    skills,
    achievements: extractAchievements(sections.achievements ?? []),
    certifications: extractCertifications(sections.certifications ?? []),
    // Identifying a *transferable* competency (inferring "Leadership" from
    // "President of Economics Club") requires actual language
    // understanding - pattern matching can't responsibly do this, so the
    // heuristic fallback never fabricates transferable skills. Only the
    // real AI provider populates this array.
    transferableSkills: [],
    workValues: extractWorkValues(resumeText.slice(0, MAX_HEURISTIC_CHARS)),
    extractionMethod: "heuristic",
  };
}

export const heuristicResumeParsingProvider: ResumeParsingProvider = {
  name: "heuristic",
  parseResume: run,
  extractCareerProfile: run,
};
