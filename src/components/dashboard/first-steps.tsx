import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  body: string;
  done: boolean;
  action?: { label: string; href: string };
  secondary?: { label: string; href: string };
}

/**
 * HOME FOR A BRAND-NEW ACCOUNT. Instead of four zeros and two empty panels,
 * the robot explains the three things to do, in order, and the next one is
 * the only button that stands out.
 */
export function FirstSteps({ firstName, hasProfile, isPro }: { firstName: string | null; hasProfile: boolean; isPro: boolean }) {
  const steps: Step[] = [
    {
      title: "Add your resume",
      body: "Upload it once. Every check and everything Work-ly writes comes from it, and you can fix anything it reads wrong.",
      done: hasProfile,
      action: { label: "Upload my resume", href: "/career-profile" },
    },
    {
      title: "Check a job you're thinking about",
      body: "Paste any posting. You'll get a straight answer (apply, stretch or skip) with a line from your resume behind every point.",
      done: false,
      action: { label: "Check a job", href: "/analyze-job" },
      secondary: { label: "or let Work-ly find matches", href: "/discover" },
    },
    {
      title: "Get the application written",
      body: isPro
        ? "For any job worth it: a resume, cover letter, a note to the hiring manager and interview prep, all from your real experience."
        : "For any job worth it, Pro writes the resume, cover letter, a note to the hiring manager and interview prep, all from your real experience.",
      done: false,
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="first-steps-title" className="feature-panel flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <Image src="/workly-bot-face.png" alt="" width={64} height={64} className="size-14 shrink-0 object-contain" />
        <div className="flex flex-col gap-1">
          <h2 id="first-steps-title" className="text-xl font-semibold tracking-tight text-foreground">
            Hi{firstName ? ` ${firstName}` : ""}! Here&apos;s how Work-ly works.
          </h2>
          <p className="text-sm text-muted-foreground">Three steps. Most people are through the first two in five minutes.</p>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li
              key={step.title}
              className={cn(
                "flex gap-4 rounded-xl border p-4 transition-colors",
                isCurrent ? "border-primary/30 bg-card shadow-sm" : "border-border/70 bg-card/50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  step.done ? "bg-success/15 text-success" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className={cn("text-[15px] font-semibold", step.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : isCurrent ? " (do this next)" : ""}</span>
                </p>
                {!step.done && <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{step.body}</p>}
                {isCurrent && step.action && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Button asChild className="gap-2">
                      <Link href={step.action.href}>
                        {step.action.label}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    {step.secondary && (
                      <Link href={step.secondary.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        {step.secondary.label}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
