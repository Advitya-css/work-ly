import "server-only";
import { aiProvider } from "@/lib/ai";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";

/**
 * Interest-based Explore mode, step two: translate a free-text interest
 * ("I want to work with climate and urban planning") into real, specific
 * job titles a hiring company would actually use - the same translation
 * role-graph.ts's curated clusters already play for the ~8 areas it
 * covers, but for everything outside that short hand-written list. This is
 * additive, not a replacement: role-graph expansion is deterministic and
 * always available; this only adds more candidate titles on top of it when
 * a real AI provider is configured, and contributes nothing (never
 * breaking Explore) when it isn't.
 *
 * These titles feed straight into a live discovery run against the user's
 * real, licensed job sources (see discovery/run.ts) - never a claim about
 * a specific real job existing, only a search term, so nothing here can
 * violate "never invent job information."
 */
const SYSTEM_PROMPT = `Given a short, informal description of a candidate's major, degree, or area of interest, output 2 to 4 REAL, specific job titles a hiring company would actually use in a posting - not vague categories, not the input restated. For example, if they enter "City Planning Major", output entry-level or standard roles for that major like "Urban Planner", "City Planner", "Transportation Analyst". Titles must be genuinely searchable on job boards (e.g. "Sustainability Analyst", "Smart City Planner", not "climate person" or "someone who cares about cities"). If the description is too vague or broad, output an empty list.`;

const RESPONSE_SCHEMA = {
  name: "interest_titles",
  schema: {
    type: "object",
    properties: {
      titles: { type: "array", items: { type: "string" } },
    },
    required: ["titles"],
  },
};

const MAX_TITLES = 4;
const MAX_TITLE_LENGTH = 80;

export async function suggestTitlesForInterest(interestText: string): Promise<string[]> {
  const trimmed = interestText.trim();
  if (!trimmed) return [];

  try {
    const result = await aiProvider.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: stripPromptInjectionMarkers(trimmed.slice(0, 500)) },
      ],
      responseSchema: RESPONSE_SCHEMA,
      // Zero, not just low - the same reasoning as the resume/job parsers:
      // the same interest typed twice should suggest the same titles, not
      // a different feed each time someone re-runs Explore.
      temperature: 0,
    });

    const parsed = (result.parsed ?? {}) as { titles?: unknown };
    if (!Array.isArray(parsed.titles)) return [];

    return parsed.titles
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0 && t.length < MAX_TITLE_LENGTH)
      .map((t) => t.trim())
      .slice(0, MAX_TITLES);
  } catch (error) {
    // Never lets Explore fail because AI title suggestion isn't configured
    // or the call failed - role-graph expansion is the guaranteed baseline
    // (see role-graph.ts); this is a best-effort enhancement on top of it.
    console.warn(
      `[workly:ai] interest-title suggestion unavailable, continuing without it: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}

const IDEAL_SYSTEM_PROMPT = `You are an expert technical recruiter and career coach. Your task is to read a candidate's full resume/profile and their target role (if provided), and generate exactly 3 highly specific, searchable job titles that this candidate is overwhelmingly qualified for.
- Do NOT generate generic titles like "Data Analyst" or "Manager".
- DO generate highly specific titles like "Senior Spatial Data Analyst", "Urban Planning Data Scientist", "Geospatial Analyst", etc.
- The titles MUST be real titles used on job boards.
- Output ONLY the array of titles.`;

const IDEAL_SCHEMA = {
  name: "ideal_titles",
  schema: {
    type: "object",
    properties: {
      titles: { type: "array", items: { type: "string" } },
    },
    required: ["titles"],
  },
};

export async function suggestIdealJobSearches(profileText: string, targetRole: string | null): Promise<string[]> {
  try {
    const prompt = `TARGET ROLE: ${targetRole || 'None'}

PROFILE:
${profileText.slice(0, 3000)}`;
    const result = await aiProvider.complete({
      messages: [
        { role: "system", content: IDEAL_SYSTEM_PROMPT },
        { role: "user", content: stripPromptInjectionMarkers(prompt) },
      ],
      responseSchema: IDEAL_SCHEMA,
      temperature: 0.2,
    });

    const parsed = (result.parsed ?? {}) as { titles?: unknown };
    if (!Array.isArray(parsed.titles)) return [];

    return parsed.titles
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0 && t.length < MAX_TITLE_LENGTH)
      .map((t) => t.trim())
      .slice(0, 3);
  } catch (error) {
    console.warn("[workly:ai] ideal-title suggestion failed:", error);
    return targetRole ? [targetRole] : [];
  }
}
