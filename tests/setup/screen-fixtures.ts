import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { Job, Skill, Experience, CareerGoal } from "@/lib/db/types";

const d = (s: string) => new Date(s);
let n = 0;
export function skill(name: string, evidenceLevel: Skill["evidenceLevel"] = "STATED"): Skill {
  return { id: `s${n++}`, careerProfileId: "p", name, category: "TECHNICAL" as any, proficiency: null, experienceLevel: null, evidenceLevel, source: "USER" as any, recency: "CURRENT" as any, isTransferable: false, transferableRationale: null, createdAt: d("2024-01-01"), updatedAt: d("2024-01-01") };
}
export function exp(title: string, company: string, start: string, end: string | null, description: string): Experience {
  return { id: `e${n++}`, careerProfileId: "p", company, title, location: null, startDate: d(start), endDate: end ? d(end) : null, isCurrent: !end, description, source: "USER" as any, isUncertain: false, createdAt: d("2024-01-01"), updatedAt: d("2024-01-01") };
}
export function profile(over: Partial<FullCareerProfile> & { headline?: string; summary?: string; currentRole?: string } = {}): FullCareerProfile {
  return {
    profile: { id: "p", userId: "u", headline: over.headline ?? null, summary: over.summary ?? null, location: "Bengaluru, India", currentRole: over.currentRole ?? null, currentCompany: null, yearsExperience: null, skills: [], resumeFileName: null, resumeFileUrl: null, resumeUploadedAt: null, parsedData: null, isStudent: false, university: null, major: null, expectedGraduation: null, studentCountry: null, preferredLocations: [], openToRemote: true, createdAt: d("2024-01-01"), updatedAt: d("2024-01-01") },
    educations: over.educations ?? [], experiences: over.experiences ?? [], projects: over.projects ?? [], skills: over.skills ?? [], achievements: [], certifications: over.certifications ?? [], documents: [], workValues: [],
  };
}
export function job(over: Partial<Job>): Job {
  return { id: "j", userId: "u", inputMethod: "PASTED_TEXT", url: null, rawInput: over.rawInput ?? over.description ?? "", status: "PARSED", errorMessage: null, title: null, company: null, location: null, country: null, salaryMin: null, salaryMax: null, salaryCurrency: null, employmentType: null, workMode: null, seniority: null, description: null, requiredExperienceYears: null, preferredExperienceYears: null, education: null, industry: null, deadline: null, datePosted: null, source: null, requiredSkills: [], preferredSkills: [], requirements: [], createdAt: d("2024-01-01"), updatedAt: d("2024-01-01"), ...over };
}
export const goal = (primaryTargetRole: string): CareerGoal => ({ id: "g", userId: "u", title: primaryTargetRole, targetRole: primaryTargetRole, targetIndustry: null, timeframe: null, notes: null, status: "ACTIVE" as any, primaryTargetRole, secondaryTargetRoles: [], industries: [], preferredLocations: [], countries: [], workModes: [], employmentTypes: [], seniority: null, salaryMin: null, salaryMax: null, salaryCurrency: null, isUncertain: false, createdAt: d("2024-01-01"), updatedAt: d("2024-01-01") });
