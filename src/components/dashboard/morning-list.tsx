import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { displayJobTitle } from "@/lib/format";
import { kindLabel, postingUrl, preparedLabel, type MorningFile, type MorningKind } from "@/lib/morning/morning-core";
import { MorningActions } from "@/components/dashboard/morning-actions";
import type { MorningPreviewItem } from "@/lib/morning/morning";
import { cn } from "@/lib/utils";

const ALL_KINDS: MorningKind[] = ["resume", "cover", "note"];

const SHORT: Record<MorningKind, string> = { resume: "Resume", cover: "Cover letter", note: "Note" };

function Header({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex items-start gap-3">
      <Image src="/workly-bot-face.png" alt="" width={48} height={48} className="size-10 shrink-0 object-contain" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{line}</p>
      </div>
    </div>
  );
}

function KindChips({ kinds, locked }: { kinds: MorningKind[]; locked?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={locked ? "Written with Pro" : "Written for you"}>
      {ALL_KINDS.filter((k) => locked || kinds.includes(k)).map((k) => (
        <li
          key={k}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            locked ? "bg-muted text-muted-foreground" : "bg-success/10 text-success",
          )}
          title={kindLabel(k)}
        >
          {locked ? <Lock className="size-3" aria-hidden /> : <Check className="size-3" aria-hidden />}
          {SHORT[k]}
        </li>
      ))}
    </ul>
  );
}

function jobLine(title: string, company: string | null): string {
  return `${displayJobTitle(title)}${company ? ` at ${company}` : ""}`;
}

/**
 * READY TO APPLY. The first thing a Pro member sees in the morning: the
 * new jobs that fit, each already checked in full, with the resume, cover
 * letter and note written. See lib/morning.
 */
export function MorningList({
  morning,
  statuses,
  targetRole,
}: {
  morning: MorningFile | null;
  /** Opportunity status by id, so a job they've applied to says so. */
  statuses: Record<string, string>;
  targetRole: string | null;
}) {
  const items = (morning?.items ?? []).filter((i) => i.opportunityId in statuses);

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <Header
          title="Ready to apply"
          line={
            targetRole
              ? `Every night I look for new ${targetRole} jobs. For the best ones I check the whole posting and write your resume, cover letter and note to the hiring manager, so they're here in the morning.`
              : "Set the role you want and every night I'll look for new jobs, check the best ones in full, and have your resume, cover letter and note written by morning."
          }
        />
        {!targetRole && (
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/career-goals">Set your target role</Link>
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <Header
          title={items.length === 1 ? "1 job ready to apply" : `${items.length} jobs ready to apply`}
          line="New jobs that fit you. I checked each one in full and wrote your application. Read it through, send it from the posting, then tell me you've applied."
        />
        {morning && <span className="text-xs text-muted-foreground sm:pt-1">{preparedLabel(morning.preparedAt)}</span>}
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {items.map((item) => {
          const applied = statuses[item.opportunityId] === "APPLIED";
          return (
            <li key={item.opportunityId} className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/opportunities/${item.opportunityId}`}
                    className="min-w-0 truncate text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {jobLine(item.title, item.company)}
                  </Link>
                  {item.fitScore != null && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-success">
                      {Math.round(item.fitScore)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">fit</span>
                    </span>
                  )}
                </div>
                {item.reason && <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{item.reason}</p>}
                <KindChips kinds={item.kinds} />
              </div>
              <MorningActions
                opportunityId={item.opportunityId}
                reviewHref={`/opportunities/${item.opportunityId}/${item.kinds.includes("resume") ? "resume" : item.kinds[0] === "cover" ? "letter" : "note"}`}
                url={postingUrl(item.url)}
                applied={applied}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The same list for a free account, from matches already found for them.
 * Nothing has been written for these, and the card says so: it shows what
 * Pro would have ready for these exact jobs, not a claim that it is.
 */
export function MorningPreview({ items, offerLine }: { items: MorningPreviewItem[]; offerLine?: string | null }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <Header
        title="Ready to apply, with Pro"
        line={`Your best new ${items.length === 1 ? "match" : "matches"} this week. With Pro, every night I check jobs like these in full and write your resume, cover letter and note, so in the morning you just read and send.`}
      />
      <ul className="flex flex-col divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">{jobLine(item.title, item.company)}</span>
              {item.fitScore != null && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {Math.round(item.fitScore)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">fit</span>
                </span>
              )}
            </div>
            <KindChips kinds={[]} locked />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UpgradeModal title="Applications ready every morning" defaultPlan="quarterly">
          <Button size="sm" className="gap-1.5">
            Get them written
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </UpgradeModal>
        <Link href="/discover" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          See these in Jobs
        </Link>
      </div>
      {offerLine && <p className="text-sm text-foreground">{offerLine}</p>}
    </section>
  );
}
