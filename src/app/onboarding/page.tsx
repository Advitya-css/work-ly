import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Compass, GraduationCap, Laptop } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { UploadStep } from "@/components/onboarding/upload-step";
import { ReviewStep } from "@/app/onboarding/review-step";
import { MatchesStep } from "@/app/onboarding/matches-step";
import { StudentStep } from "@/components/onboarding/student-step";
import { chooseOnboardingIntentAction, completeOnboardingAction, loadSampleProfileAction } from "@/lib/onboarding/actions";
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

const INTENTS = [
  {
    intent: "hunt",
    icon: Briefcase,
    title: "I'm looking for a job",
    body: "Find roles that fit, tailor every application, and prepare for interviews.",
  },
  {
    intent: "switch",
    icon: Compass,
    title: "I'm planning my next move",
    body: "See how close you are to the role you want and get a step-by-step plan to close the gap.",
  },
  {
    intent: "freelance",
    icon: Laptop,
    title: "I freelance or do contract work",
    body: "Find contract and freelance gigs instead of full-time roles.",
  },
] as const;

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

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {INTENTS.map(({ intent: value, icon: Icon, title, body }) => (
              <form key={value} action={chooseOnboardingIntentAction} className="flex">
                <input type="hidden" name="intent" value={value} />
                <button
                  type="submit"
                  className="group flex w-full items-start gap-4 rounded-xl border-2 border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-foreground">{title}</span>
                    <span className="text-sm text-muted-foreground">{body}</span>
                  </span>
                </button>
              </form>
            ))}
            <Link
              href="/onboarding?step=student-setup"
              className="group flex items-start gap-4 rounded-xl border-2 border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <GraduationCap className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold text-foreground">I&apos;m a student</span>
                <span className="text-sm text-muted-foreground">
                  Campus jobs, internships and grad roles, with work-hour limits checked for you.
                </span>
              </span>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
            <form action={loadSampleProfileAction}>
              <Button type="submit" variant="ghost" className="text-muted-foreground">
                Just looking? Explore with a sample profile
                <ArrowRight />
              </Button>
            </form>
            <form action={completeOnboardingAction}>
              <Button type="submit" variant="link" className="text-muted-foreground">
                Skip setup
              </Button>
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
