import "server-only";

import type { CareerGoal } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface CompletenessCheck {
  key: string;
  label: string;
  weight: number;
  met: boolean;
  /** Shown to the user when this item is missing - explains exactly what to do. */
  hint: string;
}

export interface ProfileCompleteness {
  percentage: number;
  checks: CompletenessCheck[];
  missing: CompletenessCheck[];
}

/**
 * A simple, transparent weighted checklist - not a black box. Every point
 * is explainable, and every point currently missing surfaces its own hint
 * so the user knows exactly what would move the number.
 */
export function calculateProfileCompleteness(
  full: FullCareerProfile,
  careerGoals: CareerGoal[],
): ProfileCompleteness {
  const { profile, educations, experiences, projects, skills, achievements, certifications, documents } = full;
  const hasParsedResume = documents.some((d) => d.status === "PARSED");
  const hasBasics = Boolean(profile?.headline || profile?.summary || profile?.currentRole);
  const confirmedSkillCount = skills.filter((s) => !s.isTransferable).length;

  const checks: CompletenessCheck[] = [
    {
      key: "resume",
      label: "Resume uploaded",
      weight: 15,
      met: hasParsedResume,
      hint: "Upload your CV so Work-ly can build a first draft of your profile.",
    },
    {
      key: "basics",
      label: "Profile basics",
      weight: 10,
      met: hasBasics,
      hint: "Add a headline, current role, or summary on your profile.",
    },
    {
      key: "experience",
      label: "Work experience",
      weight: 20,
      met: experiences.length > 0,
      hint: "Add at least one role you've held.",
    },
    {
      key: "education",
      label: "Education",
      weight: 15,
      met: educations.length > 0,
      hint: "Add at least one school, degree, or program.",
    },
    {
      key: "skills",
      label: "Skills",
      weight: 15,
      met: confirmedSkillCount >= 3,
      hint:
        confirmedSkillCount === 0
          ? "Add at least 3 confirmed skills."
          : `Add ${3 - confirmedSkillCount} more confirmed skill${3 - confirmedSkillCount === 1 ? "" : "s"}.`,
    },
    {
      key: "projects",
      label: "Projects",
      weight: 10,
      met: projects.length > 0,
      hint: "Add a project you've built or contributed to.",
    },
    {
      key: "goals",
      label: "Career goals",
      weight: 15,
      met: careerGoals.length > 0,
      hint: "Set a career goal so Work-ly knows what you're working toward.",
    },
  ];

  // Achievements/certifications are intentionally unweighted - not every
  // profile has them, so they shouldn't cap how complete a profile can be.
  void achievements;
  void certifications;

  const earned = checks.reduce((sum, c) => (c.met ? sum + c.weight : sum), 0);
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const percentage = Math.round((earned / total) * 100);

  return {
    percentage,
    checks,
    missing: checks.filter((c) => !c.met),
  };
}

export type ReadinessLabel =
  | "Just getting started"
  | "Building momentum"
  | "Nearly there"
  | "Ready to explore opportunities";

export interface CareerReadiness {
  label: ReadinessLabel;
  /** A short, honest explanation - never a hire probability (product principle: never claim precise hire odds). */
  explanation: string;
}

/**
 * First-pass "Career Readiness" - deliberately qualitative. It reflects how
 * complete and evidenced the profile is, not a prediction of hiring
 * outcomes. Job-matching-based readiness comes in a later phase.
 */
export function calculateCareerReadiness(completeness: ProfileCompleteness): CareerReadiness {
  const { percentage } = completeness;

  if (percentage >= 85) {
    return {
      label: "Ready to explore opportunities",
      explanation: "Your profile has enough depth for Work-ly to start surfacing well-matched opportunities.",
    };
  }
  if (percentage >= 60) {
    return {
      label: "Nearly there",
      explanation: "A few more details will round out your profile. Check what's missing below.",
    };
  }
  if (percentage >= 30) {
    return {
      label: "Building momentum",
      explanation: "You've made a start. Add more of your experience and skills to get a fuller picture.",
    };
  }
  return {
    label: "Just getting started",
    explanation: "Upload a CV or add your experience to build out your career profile.",
  };
}
