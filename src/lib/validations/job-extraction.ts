import { z } from "zod";

/**
 * Validates a raw AI JSON response before any of it is trusted or stored -
 * Phase 3 spec item #9. If the response doesn't conform to this shape, the
 * caller (see providers/job-ai.ts) discards it entirely and falls back to
 * the heuristic extractor rather than storing a malformed or fabricated
 * field.
 */

const employmentTypeEnum = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]).nullable();
const workModeEnum = z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullable();
const seniorityEnum = z
  .enum(["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE"])
  .nullable();

const requirementItemSchema = z.object({
  text: z.string().min(1).max(500),
  mandatory: z.boolean(),
  category: z.enum(["skill", "experience", "education", "other"]),
});

export const extractedJobSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  salaryCurrency: z.string().max(10).nullable().optional(),
  employmentType: employmentTypeEnum.optional(),
  workMode: workModeEnum.optional(),
  seniority: seniorityEnum.optional(),
  description: z.string().max(10000).nullable().optional(),
  requiredExperienceYears: z.number().int().min(0).max(60).nullable().optional(),
  preferredExperienceYears: z.number().int().min(0).max(60).nullable().optional(),
  education: z.string().max(300).nullable().optional(),
  industry: z.string().max(150).nullable().optional(),
  // Require dates to be ISO strings (e.g. 2024-01-01) if present
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Must be ISO 8601 date").nullable().optional(),
  datePosted: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Must be ISO 8601 date").nullable().optional(),
  requiredSkills: z.array(z.string().max(80)).max(60).optional(),
  preferredSkills: z.array(z.string().max(80)).max(60).optional(),
  requirements: z.array(requirementItemSchema).max(80).optional(),
}).refine(
  (data) => {
    if (data.salaryMin != null && data.salaryMax != null) {
      return data.salaryMin <= data.salaryMax;
    }
    return true;
  },
  { message: "salaryMin cannot be greater than salaryMax", path: ["salaryMax"] }
);

export type ValidatedExtractedJob = z.infer<typeof extractedJobSchema>;
