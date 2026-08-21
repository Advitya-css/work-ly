import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconProfile } from "@/components/icons";
import { CareerProfileForm } from "@/components/career/career-profile-form";
import { ResumeCard } from "@/components/career/resume-card";
import { CareerReadinessHeader } from "@/components/career/career-readiness-header";
import { ExperienceSection } from "@/components/career/sections/experience-section";
import { EducationSection } from "@/components/career/sections/education-section";
import { ProjectSection } from "@/components/career/sections/project-section";
import { SkillSection } from "@/components/career/sections/skill-section";
import { AchievementSection } from "@/components/career/sections/achievement-section";
import { CertificationSection } from "@/components/career/sections/certification-section";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { calculateCareerReadiness, calculateProfileCompleteness } from "@/lib/career/completeness";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Career Profile" };

export default async function CareerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [full, careerGoals] = await Promise.all([
    getFullCareerProfile(user.id),
    listCareerGoalsByUserId(user.id),
  ]);

  const completeness = calculateProfileCompleteness(full, careerGoals);
  const readiness = calculateCareerReadiness(completeness);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Career Profile"
        description="The single source of truth Workly uses to understand where you stand today."
      />

      <SectionTabs section="career" />

      <CareerReadinessHeader completeness={completeness} readiness={readiness} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <CareerProfileForm profile={full.profile} />
          <ExperienceSection experiences={full.experiences} />
          <EducationSection educations={full.educations} />
          <ProjectSection projects={full.projects} />
          <SkillSection skills={full.skills} />
          <AchievementSection achievements={full.achievements} />
          <CertificationSection certifications={full.certifications} />
        </div>

        <ResumeCard documents={full.documents} />
      </div>
    </div>
  );
}
