import { z } from "zod";

export const careerProfileSchema = z.object({
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  currentRole: z.string().trim().max(120).optional().or(z.literal("")),
  currentCompany: z.string().trim().max(120).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  skills: z.string().trim().max(1000).optional().or(z.literal("")),
});

const commaList = (max: number) =>
  z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max),
    );

const optionalNumber = z.coerce.number().int().min(0).max(10_000_000).optional().or(z.literal(""));

export const careerGoalSchema = z
  .object({
    title: z.string().trim().min(1, "Give this goal a title").max(150),
    timeframe: z.string().trim().max(60).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "ACHIEVED", "PAUSED", "ARCHIVED"]).optional(),

    primaryTargetRole: z.string().trim().max(150).optional().or(z.literal("")),
    secondaryTargetRoles: commaList(10),
    industries: commaList(10),
    // Comes from repeated hidden inputs (formData.getAll), same pattern as
    // workModes/employmentTypes below - not a single comma-joined string.
    preferredLocations: z.array(z.string().trim().min(1).max(120)).max(10).optional().default([]),
    countries: commaList(10),
    workModes: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])).optional().default([]),
    employmentTypes: z
      .array(z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]))
      .optional()
      .default([]),
    seniority: z
      .enum(["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE"])
      .optional()
      .or(z.literal("")),
    salaryMin: optionalNumber,
    salaryMax: optionalNumber,
    salaryCurrency: z.string().trim().max(10).optional().or(z.literal("")),
    isUncertain: z.coerce.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    salaryMin: data.salaryMin === "" || data.salaryMin === undefined ? undefined : data.salaryMin,
    salaryMax: data.salaryMax === "" || data.salaryMax === undefined ? undefined : data.salaryMax,
  }));
