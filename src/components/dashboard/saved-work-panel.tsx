import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { capitalise, describeSavedWork, kindLabel, savedVerb, type SavedWorkCounts } from "@/lib/saved-work-core";
import type { SavedWorkItem } from "@/lib/saved-work";

/**
 * Everything Work-ly has written for this person, by job. For Pro it's a
 * shortcut back to their resumes and letters. After a trial it's the clearest
 * picture of what Pro was doing for them: the work is still here, locked.
 */
export function SavedWorkPanel({
  counts,
  items,
  isPro,
  linkedin,
  offerLine,
}: {
  counts: SavedWorkCounts;
  items: SavedWorkItem[];
  isPro: boolean;
  linkedin: boolean;
  offerLine?: string | null;
}) {
  const work = describeSavedWork(counts);
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            {!isPro && <Lock className="size-4 text-primary" aria-hidden />}
            Your saved work
          </h2>
          <p className="text-sm text-muted-foreground">
            {isPro
              ? `${capitalise(work)} ${savedVerb(counts)} saved.`
              : `${capitalise(work)} ${savedVerb(counts)} still saved. Pro opens ${savedVerb(counts) === "is" ? "it" : "them"} again to edit and download.`}
          </p>
          {!isPro && offerLine && <p className="text-sm font-medium text-foreground">{offerLine}</p>}
        </div>
        {!isPro && (
          <UpgradeModal title="Keep your saved work" defaultPlan="quarterly">
            <Button size="sm" className="shrink-0">
              Unlock my work
            </Button>
          </UpgradeModal>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.opportunityId}>
            <Link
              href={item.kinds.includes("resume") ? `/opportunities/${item.opportunityId}/resume` : `/opportunities/${item.opportunityId}`}
              className="group flex items-center gap-3 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
                  {item.title}
                  {item.company && <span className="font-normal text-muted-foreground"> · {item.company}</span>}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {item.kinds.map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {kindLabel(k)}
                    </span>
                  ))}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
        {linkedin && (
          <li>
            <Link href="/linkedin" className="group flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
                {kindLabel("linkedin")}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
