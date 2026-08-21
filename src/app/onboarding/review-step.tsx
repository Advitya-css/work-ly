import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExperienceSection } from "@/components/career/sections/experience-section";
import { EducationSection } from "@/components/career/sections/education-section";
import { ProjectSection } from "@/components/career/sections/project-section";
import { SkillSection } from "@/components/career/sections/skill-section";
import { AchievementSection } from "@/components/career/sections/achievement-section";
import { completeOnboardingAction } from "@/lib/onboarding/actions";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";

export async function ReviewStep({ userId }: { userId: string }) {
  const full = await getFullCareerProfile(userId);
  const totalItems =
    full.educations.length +
    full.experiences.length +
    full.projects.length +
    full.skills.length +
    full.achievements.length;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Here&apos;s what we found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {totalItems > 0
            ? "Review everything below, and edit, add, or remove anything that isn't quite right. Items marked \"Unconfirmed\" came straight from your CV and haven't been reviewed by you yet."
            : "No resume on file yet. Add your experience, education, and skills directly, or go back and upload a CV."}
        </p>
        {full.skills.some((s) => s.isTransferable) && (
          <Badge variant="warning" className="mt-3">
            You have suggested transferable skills to review below
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <ExperienceSection experiences={full.experiences} />
        <EducationSection educations={full.educations} />
        <ProjectSection projects={full.projects} />
        <SkillSection skills={full.skills} />
        <AchievementSection achievements={full.achievements} />
      </div>

      <form action={completeOnboardingAction} className="flex justify-center">
        <Button type="submit" size="lg">
          <Check />
          Looks good: go to my dashboard
        </Button>
      </form>
    </div>
  );
}
