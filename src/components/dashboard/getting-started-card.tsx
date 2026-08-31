import Link from "next/link";
import { 
  FileText, 
  Target, 
  ScanSearch, 
  Sparkles,
  CheckCircle2,
  Circle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface GettingStartedProps {
  hasProfile: boolean;
  hasGoal: boolean;
  hasAnalyzedJob: boolean;
}

export function GettingStartedCard({ hasProfile, hasGoal, hasAnalyzedJob }: GettingStartedProps) {
  const steps = [
    {
      title: "Build your career profile",
      description: "Upload a resume or enter your experience manually.",
      href: "/career-profile",
      icon: FileText,
      isDone: hasProfile,
    },
    {
      title: "Set a career goal",
      description: "Define your target roles, location, and expectations.",
      href: "/career-goals",
      icon: Target,
      isDone: hasGoal,
    },
    {
      title: "Analyze your first job",
      description: "Analyze a job to generate your first Fit Score.",
      href: "/analyze-job",
      icon: ScanSearch,
      isDone: hasAnalyzedJob,
    },
  ];

  const completedSteps = steps.filter((s) => s.isDone).length;
  const isAllDone = completedSteps === steps.length;

  if (isAllDone) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Welcome to Work-ly! Let's get you set up.</CardTitle>
            <CardDescription>
              Complete these {steps.length} steps to unlock the full power of the Fit Algorithm and Priority Engine.
            </CardDescription>
          </div>
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href="/guide">
              <Sparkles className="mr-2 size-4" />
              Read the full Guide
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div 
                key={i}
                className={`relative flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors ${
                  step.isDone ? "border-muted bg-muted/50" : "border-primary/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {step.isDone ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                  <h3 className={`font-semibold ${step.isDone ? "text-muted-foreground line-through" : ""}`}>
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground flex-1">
                  {step.description}
                </p>
                {!step.isDone && (
                  <Button asChild variant="outline" size="sm" className="mt-2 w-fit">
                    <Link href={step.href}>
                      Go to step
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
