import "server-only";

import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listEducationByProfileId } from "@/lib/db/education";
import { listExperienceByProfileId } from "@/lib/db/experience";
import { listProjectsByProfileId } from "@/lib/db/projects";
import { listSkillsByProfileId } from "@/lib/db/skills";
import { listAchievementsByProfileId } from "@/lib/db/achievements";
import { listCertificationsByProfileId } from "@/lib/db/certifications";
import { listDocumentsByUserId } from "@/lib/db/documents";
import type {
  Achievement,
  CareerProfile,
  Certification,
  Document,
  Education,
  Experience,
  Project,
  Skill,
} from "@/lib/db/types";

export interface FullCareerProfile {
  profile: CareerProfile | null;
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  achievements: Achievement[];
  certifications: Certification[];
  documents: Document[];
}

/** Single place that assembles everything the Career Profile page, the
 * onboarding review screen, and the completeness calculation all need. */
export async function getFullCareerProfile(userId: string): Promise<FullCareerProfile> {
  const profile = await getCareerProfileByUserId(userId);
  const documents = await listDocumentsByUserId(userId);

  if (!profile) {
    return {
      profile: null,
      educations: [],
      experiences: [],
      projects: [],
      skills: [],
      achievements: [],
      certifications: [],
      documents,
    };
  }

  const [educations, experiences, projects, skills, achievements, certifications] =
    await Promise.all([
      listEducationByProfileId(profile.id),
      listExperienceByProfileId(profile.id),
      listProjectsByProfileId(profile.id),
      listSkillsByProfileId(profile.id),
      listAchievementsByProfileId(profile.id),
      listCertificationsByProfileId(profile.id),
    ]);

  return { profile, educations, experiences, projects, skills, achievements, certifications, documents };
}
