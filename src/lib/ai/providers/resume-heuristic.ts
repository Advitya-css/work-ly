import type { ResumeParsingProvider } from "@/lib/ai/resume-parser-provider-type";
import type {
  ExtractedAchievement,
  ExtractedCareerProfile,
  ExtractedCertification,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedSkill,
} from "@/lib/ai/resume-parser-types";
import type { SkillCategory } from "@/lib/db/types";

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
  education: /^education/i,
  experience: /^(work\s+)?experience|employment/i,
  projects: /^projects?$/i,
  skills: /^(technical\s+)?skills/i,
  certifications: /^certifications?|licenses?/i,
  achievements: /^(achievements?|awards?|honou?rs?)/i,
  languages: /^languages?$/i,
};

type SectionName = keyof typeof SECTION_HEADERS;

function splitIntoSections(text: string): Partial<Record<SectionName, string[]>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Partial<Record<SectionName, string[]>> = {};
  let current: SectionName | null = null;

  for (const line of lines) {
    const bare = line.replace(/[:：]\s*$/, "").replace(/^[*#_-]+\s*/, "").replace(/[*_]+$/, "");
    const matchedSection = (Object.keys(SECTION_HEADERS) as SectionName[]).find((name) =>
      SECTION_HEADERS[name].test(bare),
    );
    if (matchedSection && bare.length < 40) {
      current = matchedSection;
      sections[current] ??= [];
      continue;
    }
    if (current) {
      sections[current]!.push(line.replace(/^[*_]+|[*_]+$/g, ""));
    }
  }

  return sections;
}

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(" ");
}

const BULLET = /^[-•*●▪◦·]\s*/;

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

/** One end of a range: "March 2022", "03/2022", "3-2022", "Mar '22", "2019". */
const DATE_TOKEN = `(?:(?:${MONTHS})\\.?\\s+)?(?:\\d{1,2}[/.-])?\\s*(?:'?\\d{2}|\\d{4})`;

/** "March 2022 - Present", "July 2019 – February 2022", "2019 to 2022", "03/2022 - 06/2024". */
const DATE_RANGE = new RegExp(
  `^\\s*(${DATE_TOKEN})\\s*(?:[-–, ]|to)\\s*(present|current|now|${DATE_TOKEN})\\s*$`,
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
  const value = raw.trim();
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

/**
 * Groups a section's lines into one block per entry.
 *
 * The previous version treated EVERY line as its own entry, so a two-job CV
 * produced ten "Role not confidently identified" rows whose company names
 * were bullet fragments ("- Owned the weekly trading dashboard"). Bullets and
 * date lines are continuations of the entry above them, not new entries.
 */
function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];

  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const dateMatch = line.match(DATE_RANGE);
    const current = blocks[blocks.length - 1];

    if ((isBullet || dateMatch) && current) {
      if (dateMatch && !current.dates) {
        const endRaw = dateMatch[2];
        current.dates = {
          start: toIsoDate(dateMatch[1]),
          end: toIsoDate(endRaw),
          isCurrent: /^(present|current|now)$/i.test(endRaw.trim()),
        };
      } else {
        current.detail.push(line.replace(BULLET, "").trim());
      }
      continue;
    }

    // Line continuation: if we are in the details section and this line is not a bullet/date,
    // and it doesn't look like a new job header (e.g. starts lowercase or is long without a separator),
    // append it to the last bullet.
    if (!isBullet && !dateMatch && current && current.detail.length > 0) {
      const startsWithLower = /^[a-z]/.test(line);
      const hasHeaderSplit = /\s+[-–|]\s+|\s+\bat\b\s+/i.test(line);
      if (startsWithLower || (!hasHeaderSplit && line.split(" ").length >= 4)) {
        const lastIdx = current.detail.length - 1;
        current.detail[lastIdx] = `${current.detail[lastIdx]} ${line.trim()}`;
        continue;
      }
    }

    blocks.push({ header: line, dates: null, detail: [] });
  }

  return blocks;
}

/** Splits "Product Analyst - Northwind Retail, London" into its parts. */
function splitHeader(header: string): { title: string | null; company: string; location?: string } {
  const parts = header.split(/\s+[-–, |]\s+|\s+\bat\b\s+/i).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const [title, rest] = parts;
    const segments = rest.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      title,
      company: segments[0] ?? rest,
      location: segments.length > 1 ? segments.slice(1).join(", ") : undefined,
    };
  }

  // No separator to work with. Report the line as the company and say plainly
  // that the role could not be read, rather than guessing at a job title.
  return { title: null, company: firstNWords(header, 8) };
}

function extractEducation(lines: string[]): ExtractedEducation[] {
  return groupBlocks(lines)
    .slice(0, 10)
    .map((block) => {
      const segments = block.header.split(",").map((s) => s.trim()).filter(Boolean);
      const institutionIndex = segments.findIndex((s) =>
        /university|college|school|institute|academy/i.test(s),
      );
      const institution =
        institutionIndex >= 0 ? segments[institutionIndex] : firstNWords(block.header, 8);
      const degree = institutionIndex > 0 ? segments[0] : undefined;

      return {
        institution,
        degree,
        startDate: block.dates?.start ?? undefined,
        endDate: block.dates?.end ?? undefined,
        description: [block.header, ...block.detail].join(", ").slice(0, 500),
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
    .split(/[,•|]/)
    .map((s) => s.trim())
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

async function run(resumeText: string): Promise<ExtractedCareerProfile> {
  const sections = splitIntoSections(resumeText);

  const skills = [
    ...extractSkills(sections.skills ?? [], "TECHNICAL"),
    ...extractSkills(sections.languages ?? [], "LANGUAGE"),
  ];

  const experience = extractExperience(sections.experience ?? []);

  return {
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
    extractionMethod: "heuristic",
  };
}

export const heuristicResumeParsingProvider: ResumeParsingProvider = {
  name: "heuristic",
  parseResume: run,
  extractCareerProfile: run,
};
