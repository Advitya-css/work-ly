import { Check, X } from "lucide-react";

const alonePoints = [
  "The same resume sent to every role",
  "Guessing whether you're a good fit",
  "Walking into interviews unrehearsed",
  "No clear sense of what's holding you back",
];

const worklyPoints = [
  "A resume and cover letter tailored to each role",
  "An honest fit score, with the reasons behind it",
  "Mock interviews with feedback on every answer",
  "A concrete plan to become more competitive",
];

export function ComparisonSection() {
  return (
    <section id="why-work-ly" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <span className="text-sm font-medium text-primary">Your career, with a coach.</span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground">
            Applying is hard to do well alone. Work-ly does the preparation with you.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-muted-foreground">On your own</p>
            <ul className="mt-4 flex flex-col gap-3">
              {alonePoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/30 bg-accent/40 p-6">
            <p className="text-sm font-semibold text-foreground">With Work-ly</p>
            <ul className="mt-4 flex flex-col gap-3">
              {worklyPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
