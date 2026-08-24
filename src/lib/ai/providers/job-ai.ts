import { aiProvider } from "@/lib/ai";
import type { JobParsingProvider } from "@/lib/ai/job-parser-provider-type";
import type { ExtractedJob } from "@/lib/ai/job-parser-types";
import { extractedJobSchema } from "@/lib/validations/job-extraction";
import { heuristicJobParsingProvider } from "@/lib/ai/providers/job-heuristic";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";

const SYSTEM_PROMPT = `You extract structured information from a job posting's text. Follow these rules strictly:

1. Only extract information explicitly present in the text. Never invent a company name, salary, requirement, or skill that isn't there. If a field isn't stated, return null (or an empty array for list fields).
2. Split every requirement/qualification line into the "requirements" array. Set "mandatory": true for anything listed as required/must-have/minimum qualifications, and "mandatory": false for anything listed as preferred/nice-to-have/bonus. If the posting doesn't distinguish, use your best judgment from the language used ("must have" vs "would be nice"), and prefer marking something mandatory only when the text is clearly non-optional.
3. Categorize each requirement as "skill", "experience", "education", or "other".
4. CRITICAL: "requiredSkills" and "preferredSkills" MUST be atomic technologies, frameworks, methodologies, and hard skills (e.g. "React", "Node.js", "REST APIs", "Microservices", "Docker", "Agile"). DO NOT extract full sentences or vague phrases like "Build scalable backends". Break down complex requirements into the specific keywords a recruiter would search for.
5. For date fields (deadline, datePosted), output strictly in ISO 8601 format (YYYY-MM-DD). Convert text like "Next Friday" or "Q3 2024" to an approximate ISO string, or return null if impossible.
6. Output strict JSON matching the schema you're given. No prose, no markdown fences.`;

const RESPONSE_SCHEMA = {
  name: "extracted_job",
  schema: {
    type: "object",
    properties: {
      title: { type: ["string", "null"] },
      company: { type: ["string", "null"] },
      location: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      salaryMin: { type: ["number", "null"] },
      salaryMax: { type: ["number", "null"] },
      salaryCurrency: { type: ["string", "null"] },
      employmentType: {
        type: ["string", "null"],
        enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", null],
      },
      workMode: { type: ["string", "null"], enum: ["REMOTE", "HYBRID", "ONSITE", null] },
      seniority: {
        type: ["string", "null"],
        enum: ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE", null],
      },
      description: { type: ["string", "null"] },
      requiredExperienceYears: { type: ["number", "null"] },
      preferredExperienceYears: { type: ["number", "null"] },
      education: { type: ["string", "null"] },
      industry: { type: ["string", "null"] },
      deadline: { type: ["string", "null"] },
      datePosted: { type: ["string", "null"] },
      requiredSkills: { type: "array", items: { type: "string" } },
      preferredSkills: { type: "array", items: { type: "string" } },
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            mandatory: { type: "boolean" },
            category: { type: "string", enum: ["skill", "experience", "education", "other"] },
          },
          required: ["text", "mandatory", "category"],
        },
      },
    },
    required: ["requiredSkills", "preferredSkills", "requirements"],
  },
};

async function run(jobText: string): Promise<ExtractedJob> {
  const result = await aiProvider.complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      // Stripped only on this copy sent to the model - grounding still
      // compares extracted claims against the original jobText.
      { role: "user", content: stripPromptInjectionMarkers(jobText.slice(0, 20000)) },
    ],
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.1,
  });

  const validated = extractedJobSchema.safeParse(result.parsed);
  if (!validated.success) {
    // The model returned something that doesn't match the contract we
    // require - never store an unvalidated shape. Fall back to the
    // heuristic extractor rather than trust it. Logged loudly: this path
    // is otherwise indistinguishable from "no AI provider configured",
    // which makes a half-working AI setup very hard to diagnose.
    console.warn(
      "[workly:ai] job extraction failed schema validation. Using heuristic result instead. Issues:",
      validated.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return heuristicJobParsingProvider.parseJob(jobText);
  }

  const data = validated.data;
  return {
    title: data.title ?? null,
    company: data.company ?? null,
    location: data.location ?? null,
    country: data.country ?? null,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    salaryCurrency: data.salaryCurrency ?? null,
    employmentType: data.employmentType ?? null,
    workMode: data.workMode ?? null,
    seniority: data.seniority ?? null,
    description: data.description ?? null,
    requiredExperienceYears: data.requiredExperienceYears ?? null,
    preferredExperienceYears: data.preferredExperienceYears ?? null,
    education: data.education ?? null,
    industry: data.industry ?? null,
    deadline: data.deadline ?? null,
    datePosted: data.datePosted ?? null,
    requiredSkills: data.requiredSkills ?? [],
    preferredSkills: data.preferredSkills ?? [],
    requirements: data.requirements ?? [],
    extractionMethod: "ai",
  };
}

export const aiJobParsingProvider: JobParsingProvider = {
  name: "ai",
  parseJob: run,
};
