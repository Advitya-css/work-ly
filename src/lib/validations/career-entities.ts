import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  degree: optionalText(150),
  fieldOfStudy: optionalText(150),
  startDate: optionalDate,
  endDate: optionalDate,
  description: optionalText(2000),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  title: z.string().trim().min(1, "Title is required").max(200),
  location: optionalText(150),
  startDate: optionalDate,
  endDate: optionalDate,
  isCurrent: z.coerce.boolean().optional(),
  description: optionalText(3000),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200),
  role: optionalText(150),
  description: optionalText(2000),
  url: optionalText(300),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(120),
  category: z.enum(["TECHNICAL", "SOFT", "DOMAIN", "TOOL", "LANGUAGE", "OTHER"]),
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional().or(z.literal("")),
  experienceLevel: z
    .enum(["UNDER_1_YEAR", "ONE_TO_3_YEARS", "THREE_TO_5_YEARS", "FIVE_PLUS_YEARS"])
    .optional()
    .or(z.literal("")),
  evidenceLevel: z.enum(["STATED", "DEMONSTRATED", "CERTIFIED", "INFERRED"]),
  recency: z.enum(["CURRENT", "WITHIN_1_YEAR", "WITHIN_3_YEARS", "OVER_3_YEARS", "UNKNOWN"]),
});

export const achievementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(2000),
  date: optionalDate,
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required").max(200),
  issuer: optionalText(200),
  issueDate: optionalDate,
  expiryDate: optionalDate,
  credentialUrl: optionalText(300),
});
