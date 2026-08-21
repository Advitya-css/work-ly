import type { DreamJob, Job } from "@/lib/db/types";

/**
 * Shapes a parsed DreamJob into a Job-like object so scoringProvider.analyzeFit
 * - the exact same deterministic Fit engine used for real postings in
 * Phase 3/4 - can be reused unmodified for Phase 5's "Readiness Score".
 * This is deliberate: Readiness IS Fit, computed the same trusted way and
 * relabeled, never a second parallel implementation that could quietly
 * diverge from what "Candidate Fit" means elsewhere in the product.
 *
 * DreamJob mirrors Job's extracted-field shape field-for-field (same
 * parser produces both), so this is a straight pass-through plus a few
 * placeholder fields Job has that DreamJob doesn't need (inputMethod, url).
 */
export function dreamJobToJobLike(dreamJob: DreamJob): Job {
  return {
    id: dreamJob.id,
    userId: dreamJob.userId,
    inputMethod: "PASTED_TEXT",
    url: null,
    rawInput: dreamJob.rawInput,
    status: dreamJob.status,
    errorMessage: dreamJob.errorMessage,

    title: dreamJob.title,
    company: dreamJob.company,
    location: dreamJob.location,
    country: dreamJob.country,
    salaryMin: dreamJob.salaryMin,
    salaryMax: dreamJob.salaryMax,
    salaryCurrency: dreamJob.salaryCurrency,
    employmentType: dreamJob.employmentType,
    workMode: dreamJob.workMode,
    seniority: dreamJob.seniority,
    description: dreamJob.description,
    requiredExperienceYears: dreamJob.requiredExperienceYears,
    preferredExperienceYears: dreamJob.preferredExperienceYears,
    education: dreamJob.education,
    industry: dreamJob.industry,
    deadline: dreamJob.deadline,
    datePosted: dreamJob.datePosted,
    source: dreamJob.source,

    requiredSkills: dreamJob.requiredSkills,
    preferredSkills: dreamJob.preferredSkills,
    requirements: dreamJob.requirements,

    createdAt: dreamJob.createdAt,
    updatedAt: dreamJob.updatedAt,
  };
}
