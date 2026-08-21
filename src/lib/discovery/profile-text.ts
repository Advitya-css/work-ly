import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * The flattened profile text used for role-graph affinity and embedding.
 *
 * Kept in its own module because both the server-side discovery run and
 * the search engine need it, and importing run.ts from the search path
 * would drag "server-only" into places that don't need it.
 */
export function profileSearchText(profile: FullCareerProfile): string {
  return [
    profile.profile?.currentRole ?? "",
    profile.profile?.headline ?? "",
    profile.profile?.summary ?? "",
    ...profile.experiences.map((experience) => `${experience.title} ${experience.description ?? ""}`),
    ...profile.projects.map((project) => `${project.name} ${project.description ?? ""}`),
    ...profile.skills.map((skill) => skill.name),
    ...profile.educations.map((education) => `${education.degree ?? ""} ${education.fieldOfStudy ?? ""}`),
  ]
    .filter(Boolean)
    .join(" \n ");
}
