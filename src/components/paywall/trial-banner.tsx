import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { cn } from "@/lib/utils";
import { capitalise, describeSavedWork, savedVerb, totalSaved, type SavedWorkCounts } from "@/lib/saved-work-core";

/** The last stretch of the trial, when the banner turns from a tip into a heads-up. */
export const TRIAL_FINAL_HOURS = 6;

/**
 * Across the top of the app while the one-day trial runs.
 *
 * Early on it says what to try. Once something is built it says what's
 * saved, and in the last few hours it says plainly what happens next:
 * the work stays, but editing and downloading it needs Pro. That's the
 * moment someone decides, so it's the moment to show the founding price.
 */
export function TrialBanner({
  endsAt,
  saved,
  offerLine,
}: {
  endsAt: Date;
  saved: SavedWorkCounts;
  /** e.g. "Founding price: the 3-Month Pass is $29.99 instead of $49.99." */
  offerLine?: string | null;
}) {
  const msLeft = new Date(endsAt).getTime() - Date.now();
  const hours = Math.max(0, Math.ceil(msLeft / 3_600_000));
  const left = hours <= 1 ? "less than an hour left" : `${hours} hours left`;
  const final = hours <= TRIAL_FINAL_HOURS;
  const built = totalSaved(saved) > 0;
  const work = describeSavedWork(saved);

  let body: string;
  if (built && final) {
    body = `${capitalise(work)} ${savedVerb(saved)} saved. They stay in your account, but you'll need Pro to open, edit or download them.`;
  } else if (built) {
    body = `You've built ${work}. Try the cover letter and likely interview questions on the same job too.`;
  } else if (final) {
    body = "There's still time to build a tailored resume for a real job. Open one from Jobs and it takes about a minute.";
  } else {
    body = "Try a tailored resume on a real job before it ends.";
  }

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        final ? "border-warning/50 bg-warning/10" : "border-primary/30 bg-primary/5",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5 text-sm text-foreground">
        {final ? (
          <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        ) : (
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        )}
        <p className="flex flex-col gap-0.5">
          <span>
            <span className="font-semibold">Pro trial: {left}.</span> <span className="text-muted-foreground">{body}</span>
          </span>
          {final && offerLine && <span className="font-medium text-foreground">{offerLine}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {!built && (
          <Link href="/opportunities" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Open a job
          </Link>
        )}
        <UpgradeModal title="Keep Work-ly Pro" defaultPlan="quarterly">
          <Button size="sm" className="shrink-0">
            Keep Pro
          </Button>
        </UpgradeModal>
      </div>
    </div>
  );
}
