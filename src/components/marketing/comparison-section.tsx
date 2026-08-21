import { Check, X } from "lucide-react";

const jobBoardPoints = [
  "Thousands of listings, no ranking",
  "You do all the filtering, manually",
  "No explanation for why a role fits",
  "No sense of what's actually holding you back",
];

const worklyPoints = [
  "A short list, ranked and explained",
  "AI does the first pass. You make the call",
  "Clear, fact-based reasoning for every match",
  "A concrete pathway to become more competitive",
];

export function ComparisonSection() {
  return (
    <section id="not-a-job-board" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <span className="text-sm font-medium text-primary">Not another job board.</span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground">
            Job boards show you listings. Workly tells you what to do with them.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-muted-foreground">Traditional job boards</p>
            <ul className="mt-4 flex flex-col gap-3">
              {jobBoardPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/30 bg-accent/40 p-6">
            <p className="text-sm font-semibold text-foreground">Workly</p>
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
