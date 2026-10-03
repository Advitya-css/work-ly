import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { PendingSubmitButton } from "@/components/shared/pending-submit-button";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { UploadStep } from "@/components/onboarding/upload-step";
import { ReviewStep } from "@/app/onboarding/review-step";
import { MatchesStep } from "@/app/onboarding/matches-step";
import { StudentStep } from "@/components/onboarding/student-step";
import { GraderImportCard } from "@/components/onboarding/grader-import-card";
import { IntentChoices } from "@/components/onboarding/intent-choices";
import { completeOnboardingAction, loadSampleProfileAction } from "@/lib/onboarding/actions";
import { parseOnboardingIntent } from "@/lib/onboarding/intent";
import { getCurrentUser } from "@/lib/auth";
import { listSupportedStudentCountries } from "@/lib/student/country-rules-db";

export const metadata: Metadata = { title: "Welcome" };
// The matches step reads the first discovery run's results.
export const dynamic = "force-dynamic";
// The first-matches step reads the top matches in full (a model call each).
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

type OnboardingStep = "welcome" | "upload" | "review" | "matches" | "student-setup";

function resolveStep(raw: string | undefined): OnboardingStep {
  if (raw === "upload" || raw === "review" || raw === "matches" || raw === "student-setup") return raw;
  return "welcome";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; intent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { step: rawStep, intent: rawIntent } = await searchParams;
  const step = resolveStep(rawStep);
  const intent = parseOnboardingIntent(rawIntent);
  const stepIndex = step === "welcome" ? 0 : step === "matches" ? 2 : 1;

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {(step === "upload" || step === "review" || step === "matches") && <StepIndicator current={stepIndex} />}

      {step === "welcome" && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
              Welcome to Work-ly{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">What brings you here? This sets up your first search.</p>
          </div>

          <GraderImportCard />

          <IntentChoices />

          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
            <form action={loadSampleProfileAction}>
              <PendingSubmitButton variant="ghost" className="text-muted-foreground" pendingLabel="Loading the sample profile…">
                Just looking? Explore with a sample profile
                <ArrowRight />
              </PendingSubmitButton>
            </form>
            <form action={completeOnboardingAction}>
              <PendingSubmitButton variant="link" className="text-muted-foreground">
                Skip setup
              </PendingSubmitButton>
            </form>
          </div>
        </>
      )}

      {step === "student-setup" && <StudentStep countries={await listSupportedStudentCountries()} />}


      {step === "upload" && <UploadStep intent={intent} />}

      {step === "review" && <ReviewStep userId={user.id} />}

      {step === "matches" && <MatchesStep userId={user.id} intent={intent} />}
    </div>
  );
}
