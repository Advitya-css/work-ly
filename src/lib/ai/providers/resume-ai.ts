import { aiProvider } from "@/lib/ai";
import type { ResumeParsingProvider } from "@/lib/ai/resume-parser-provider-type";
import type { ExtractedCareerProfile } from "@/lib/ai/resume-parser-types";
import { heuristicResumeParsingProvider } from "@/lib/ai/providers/resume-heuristic";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";
import { WORK_VALUES } from "@/lib/values/value-graph";

const WORK_VALUE_KEYS = WORK_VALUES.map((v) => v.key);

const SYSTEM_PROMPT = `You extract structured career information from resume text. Follow these rules strictly:

1. Only extract information that is explicitly present in the text. Never invent, guess, or embellish employers, dates, degrees, or skills that aren't there.
2. If a field's value is ambiguous, partially legible, or requires interpretation to fill in, set "isUncertain": true on that entry. Otherwise set it false.
3. Distinguish REAL LISTED SKILLS (stated directly, e.g. under a "Skills" heading, or clearly demonstrated by a project/job description) from TRANSFERABLE SKILLS (competencies not stated as a skill but reasonably implied by a role or achievement. E.g. "President of Economics Club" implies leadership, event management, communication). Put the first kind in "skills" and the second kind ONLY in "transferableSkills", each with a one-sentence "rationale" explaining the inference. Never put an inferred competency in "skills".
4. Include languages spoken as skills with category "LANGUAGE".
5. Output strict JSON matching the schema you're given. No prose, no markdown fences.
6. Separately, in "workValues": infer which of these exact catalog keys the candidate's work history genuinely supports - ${WORK_VALUE_KEYS.join(", ")}. This is an interpretation, not a stated fact, so apply the same discipline as transferable skills: only include a value when specific roles, employers, projects, or descriptions in the CV actually support it (e.g. two jobs at climate-tech companies supports "sustainability_climate"; a CV that never mentions anything like this supports none of them - an empty list is the correct, expected answer for most resumes). For each one included, give a confidence from 0 to 1 reflecting how clearly the CV supports it (not how desirable the value is), and "evidence" naming the specific thing in the CV that supports it. Never invent evidence, and never include a value with no real textual basis - do not put anything in the 'summary' field about this, workValues is the only place it belongs.`;

const RESPONSE_SCHEMA = {
  name: "extracted_career_profile",
  schema: {
    type: "object",
    properties: {
      headline: { type: "string" },
      summary: { type: "string" },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            degree: { type: "string" },
            fieldOfStudy: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            description: { type: "string" },
            isUncertain: { type: "boolean" },
          },
          required: ["institution", "isUncertain"],
        },
      },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            isCurrent: { type: "boolean" },
            description: { type: "string" },
            isUncertain: { type: "boolean" },
          },
          required: ["company", "title", "isUncertain"],
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            isUncertain: { type: "boolean" },
          },
          required: ["name", "isUncertain"],
        },
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: {
              type: "string",
              enum: ["TECHNICAL", "SOFT", "DOMAIN", "TOOL", "LANGUAGE", "OTHER"],
            },
            evidenceLevel: {
              type: "string",
              enum: ["STATED", "DEMONSTRATED", "CERTIFIED", "INFERRED"],
            },
            isUncertain: { type: "boolean" },
          },
          required: ["name", "category", "evidenceLevel", "isUncertain"],
        },
      },
      achievements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            date: { type: "string" },
            isUncertain: { type: "boolean" },
          },
          required: ["title", "isUncertain"],
        },
      },
      certifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            issuer: { type: "string" },
            issueDate: { type: "string" },
            expiryDate: { type: "string" },
            isUncertain: { type: "boolean" },
          },
          required: ["name", "isUncertain"],
        },
      },
      transferableSkills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: {
              type: "string",
              enum: ["TECHNICAL", "SOFT", "DOMAIN", "TOOL", "LANGUAGE", "OTHER"],
            },
            rationale: { type: "string" },
          },
          required: ["name", "category", "rationale"],
        },
      },
      workValues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            value: { type: "string", enum: WORK_VALUE_KEYS },
            confidence: { type: "number" },
            evidence: { type: "string" },
          },
          required: ["value", "confidence", "evidence"],
        },
      },
    },
    required: [
      "education",
      "experience",
      "projects",
      "skills",
      "achievements",
      "certifications",
      "transferableSkills",
      "workValues",
    ],
  },
};

async function run(resumeText: string): Promise<ExtractedCareerProfile> {
  const result = await aiProvider.complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      // Stripped only on this copy sent to the model - grounding still
      // compares extracted claims against the original resumeText below,
      // so a real skill or project mentioning e.g. "System Administrator"
      // is untouched there even though a role-marker-shaped line here is.
      { role: "user", content: stripPromptInjectionMarkers(resumeText.slice(0, 20000)) },
    ],
    responseSchema: RESPONSE_SCHEMA,
    // Zero, not just low - see the matching comment in providers/job-ai.ts.
    // This extraction feeds every downstream Fit score for this candidate,
    // so it needs to be the same skill list every time the same resume
    // text is (re-)parsed, not a slightly different one each run.
    temperature: 0,
  });

  const parsed = (result.parsed ?? {}) as Partial<ExtractedCareerProfile>;

  // A model that ignored the response schema (or returned unparseable
  // content) leaves `parsed` empty. Previously that produced a completely
  // blank profile still labelled extractionMethod: "ai" - i.e. the UI told
  // the user their CV had been read by AI and simply contained nothing,
  // which is both wrong and impossible for them to debug. Fall back to the
  // heuristic parser and report that honestly instead.
  const gotAnything =
    Boolean(parsed.headline || parsed.summary) ||
    [parsed.education, parsed.experience, parsed.projects, parsed.skills, parsed.achievements, parsed.certifications]
      .some((list) => Array.isArray(list) && list.length > 0);

  if (!gotAnything) {
    console.warn(
      "[workly:ai] resume extraction returned nothing usable. Falling back to heuristic parsing. " +
        "Check that the configured model supports structured output (response_format: json_schema).",
    );
    return heuristicResumeParsingProvider.parseResume(resumeText);
  }

  const experience = parsed.experience ?? [];

  let yearsExperience: number | null = null;
  const spans = experience
    .filter((e) => e.startDate)
    .map((e) => ({
      start: new Date(e.startDate!).getTime(),
      end: e.isCurrent || !e.endDate ? Date.now() : new Date(e.endDate).getTime(),
    }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  if (spans.length > 0) {
    const merged: { start: number; end: number }[] = [];
    for (const span of spans) {
      const last = merged[merged.length - 1];
      if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
      else merged.push({ ...span });
    }
    const totalMs = merged.reduce((sum, s) => sum + (s.end - s.start), 0);
    const years = Math.round(totalMs / (1000 * 60 * 60 * 24 * 365.25));
    if (years > 0) yearsExperience = Math.min(years, 60);
  }

  // The schema's enum should already constrain this, but providers vary in
  // how strictly they enforce enum fields - a value key outside the real
  // catalog would otherwise persist as an orphaned tag that never matches
  // anything on the job side and never renders a label anywhere.
  const workValues = (parsed.workValues ?? []).filter((v) => WORK_VALUE_KEYS.includes(v.value));

  return {
    headline: parsed.headline,
    summary: parsed.summary,
    education: parsed.education ?? [],
    experience,
    yearsExperience: yearsExperience ?? undefined,
    projects: parsed.projects ?? [],
    skills: parsed.skills ?? [],
    achievements: parsed.achievements ?? [],
    certifications: parsed.certifications ?? [],
    transferableSkills: parsed.transferableSkills ?? [],
    workValues,
    extractionMethod: "ai",
  };
}

export const aiResumeParsingProvider: ResumeParsingProvider = {
  name: "ai",
  parseResume: run,
  extractCareerProfile: run,
};
