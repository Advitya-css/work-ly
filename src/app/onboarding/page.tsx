import type { Metadata } from "next";
import Link from "next/link";
import { Check, FileText, Compass, Target, TrendingUp, GraduationCap, Briefcase } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { UploadStep } from "@/components/onboarding/upload-step";
import { ReviewStep } from "@/app/onboarding/review-step";
import { StudentStep } from "@/components/onboarding/student-step";
import { completeOnboardingAction } from "@/lib/onboarding/actions";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome" };

const steps = [
  {
    icon: FileText,
    title: "Build your career profile",
    description: "Add your experience and preferences so Workly understands where you stand.",
  },
  {
    icon: Compass,
    title: "Discover opportunities",
    description: "We surface and prioritize roles worth your attention. Not thousands of listings.",
  },
  {
    icon: Target,
    title: "See your gaps, clearly",
    description: "Understand exactly what separates you from the roles you actually want.",
  },
  {
    icon: TrendingUp,
    title: "Close them systematically",
    description: "Follow a practical pathway that makes you more competitive over time.",
  },
];

type OnboardingStep = "welcome" | "upload" | "review" | "student-setup";

function resolveStep(raw: string | undefined): OnboardingStep {
  if (raw === "upload" || raw === "review" || raw === "student-setup") return raw;
  return "welcome";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { step: rawStep } = await searchParams;
  const step = resolveStep(rawStep);
  const stepIndex = step === "welcome" ? 0 : step === "upload" ? 1 : 2;

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {(step === "upload" || step === "review") && <StepIndicator current={stepIndex} />}

      {step === "welcome" && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to Workly{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you here as a student looking for campus/grad roles, or an established professional?
            </p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 mt-4">
            <Link href="/onboarding?step=student-setup" className="group">
              <Card variant="interactive" className="h-full border-2 border-transparent hover:border-[var(--area-color,var(--primary))]/35">
                <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <GraduationCap className="size-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Student Mode</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Track on-campus jobs, strict visa limit enforcement, and new grad roles.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/onboarding?step=upload" className="group">
              <Card variant="interactive" className="h-full border-2 border-transparent hover:border-[var(--area-color,var(--primary))]/35">
                <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="size-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Professional</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload your resume, build a profile, and find your next senior role.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <form action={completeOnboardingAction}>
              <Button type="submit" variant="ghost">
                Skip setup
              </Button>
            </form>
          </div>
        </>
      )}
      
      {step === "student-setup" && <StudentStep />}


      {step === "upload" && <UploadStep />}

      {step === "review" && <ReviewStep userId={user.id} />}
    </div>
  );
}
