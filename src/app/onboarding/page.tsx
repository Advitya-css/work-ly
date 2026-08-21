import type { Metadata } from "next";
import Link from "next/link";
import { Check, FileText, Compass, Target, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { UploadStep } from "@/components/onboarding/upload-step";
import { ReviewStep } from "@/app/onboarding/review-step";
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

type OnboardingStep = "welcome" | "upload" | "review";

function resolveStep(raw: string | undefined): OnboardingStep {
  if (raw === "upload" || raw === "review") return raw;
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
      <StepIndicator current={stepIndex} />

      {step === "welcome" && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to Workly{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Here&apos;s how the platform works, start to finish.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {steps.map((item, index) => (
              <Card key={item.title} className="text-left">
                <CardContent className="flex gap-3 px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <item.icon className="size-4 text-accent-foreground" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Step {index + 1}</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <form action={completeOnboardingAction}>
              <Button type="submit" variant="ghost">
                Skip setup
              </Button>
            </form>
            <Button asChild size="lg">
              <Link href="/onboarding?step=upload">
                <Check />
                Get started
              </Link>
            </Button>
          </div>
        </>
      )}

      {step === "upload" && <UploadStep />}

      {step === "review" && <ReviewStep userId={user.id} />}
    </div>
  );
}
