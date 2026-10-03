"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Compass, GraduationCap, Laptop, Loader2 } from "lucide-react";

import { chooseOnboardingIntentAction } from "@/lib/onboarding/actions";

/**
 * The four "What brings you here?" cards. Picking one takes a couple of
 * seconds (the next step is rendered on the server), so the chosen card
 * shows a spinner and every card is locked until it's done: a second click
 * used to start the load again from scratch.
 */

const CHOICES = [
  {
    value: "hunt",
    icon: Briefcase,
    title: "I'm looking for a job",
    body: "Find roles that fit, tailor every application, and prepare for interviews.",
  },
  {
    value: "switch",
    icon: Compass,
    title: "I'm planning my next move",
    body: "See how close you are to the role you want and get a step-by-step plan to close the gap.",
  },
  {
    value: "freelance",
    icon: Laptop,
    title: "I freelance or do contract work",
    body: "Find contract and freelance gigs instead of full-time roles.",
  },
  {
    value: "student",
    icon: GraduationCap,
    title: "I'm a student",
    body: "Campus jobs, internships and grad roles, with work-hour limits checked for you.",
  },
] as const;

type Choice = (typeof CHOICES)[number]["value"];

export function IntentChoices() {
  const router = useRouter();
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = chosen !== null && pending;

  function choose(value: Choice) {
    if (busy) return;
    setChosen(value);
    startTransition(async () => {
      if (value === "student") {
        router.push("/onboarding?step=student-setup");
        return;
      }
      const data = new FormData();
      data.set("intent", value);
      await chooseOnboardingIntentAction(data);
    });
  }

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2" aria-busy={busy}>
      {CHOICES.map(({ value, icon: Icon, title, body }) => {
        const isChosen = busy && chosen === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            disabled={busy}
            aria-pressed={chosen === value}
            className={`group flex w-full items-start gap-4 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait ${
              isChosen
                ? "border-primary shadow-md"
                : busy
                  ? "border-border opacity-50"
                  : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            }`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              {isChosen ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-foreground">{title}</span>
              <span className="text-sm text-muted-foreground">{isChosen ? "Setting up your next step…" : body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
