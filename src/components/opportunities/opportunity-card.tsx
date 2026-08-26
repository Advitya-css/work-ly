"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bookmark, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyMonogram } from "@/components/shared/company-monogram";
import { PriorityMeter } from "@/components/shared/priority-meter";
import { cn } from "@/lib/utils";
import { toggleOpportunitySavedAction } from "@/lib/opportunities/actions";
import {
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_VARIANT,
  RECOMMENDATION_LABEL,
  RECOMMENDATION_VARIANT,
  WORK_MODE_LABEL,
} from "@/lib/jobs/labels";
import { formatSalaryRange } from "@/lib/format";
import { classifyStudentJob } from "@/lib/student/legal-limits";
import { IconStudent } from "@/components/icons";
import type { OpportunityWithJob } from "@/lib/db/types";

/**
 * One opportunity, cut to what you actually decide on and given something
 * to look at.
 *
 * The original card carried thirteen competing elements. The last pass cut
 * that to five, which fixed the density but left a card made entirely of
 * sentences, and a page of those is its own kind of hard to read: every row
 * looks identical, so finding your place means reading rather than
 * recognising.
 *
 * So two visual anchors came back, both carrying real information rather
 * than decorating:
 *
 *   The monogram. A stable colour and initial per employer, so the same
 *   company looks the same everywhere and a list becomes scannable.
 *
 *   The priority meter. A bar rather than a ring, because bars share a
 *   baseline and can be compared down a column at a glance, which is the
 *   actual task on this screen.
 *
 * Everything else still lives on the analysis page.
 */
export function OpportunityCard({ opportunity, university }: { opportunity: OpportunityWithJob, university?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const { job, analysis } = opportunity;

  const locationLine = [job.location, job.workMode ? WORK_MODE_LABEL[job.workMode] : null]
    .filter(Boolean)
    .join(" · ");
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const studentKind = university ? classifyStudentJob({
    title: job.title,
    company: job.company,
    employmentType: job.employmentType,
    description: job.description,
    location: job.location,
    university
  }) : null;
  const isStudentBadge = studentKind  && studentKind !== "wrong-location";

  // One line, and a strength is preferred over a gap: the card is a reason
  // to open something, and the full picture is one click away.
  const reason = analysis?.strengths?.[0] ?? analysis?.gaps?.[0]?.title ?? null;

  function toggleSaved() {
    startTransition(() => toggleOpportunitySavedAction(opportunity.id, !opportunity.isSaved));
  }

  return (
    <Card variant="interactive" className="h-full">
      <CardContent className="flex h-full flex-col gap-4 px-5 py-5">
        <div className="flex items-start gap-3">
          <CompanyMonogram name={job.company} />

          <div className="min-w-0 flex-1">
            <Link
              href={`/opportunities/${opportunity.id}`}
              className="line-clamp-2 text-[15px] leading-snug font-semibold text-foreground transition-colors hover:text-primary break-words"
            >
              {job.title ?? "Untitled role"}
            </Link>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {job.company ?? "Unknown company"}
            </p>
            {locationLine && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{locationLine}</span>
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 shrink-0 transition-transform active:scale-90",
              opportunity.isSaved && "text-primary",
            )}
            onClick={toggleSaved}
            disabled={isPending}
            aria-label={opportunity.isSaved ? "Remove from saved" : "Save this opportunity"}
          >
            <Bookmark className={cn("size-4", opportunity.isSaved && "fill-current")} />
          </Button>
        </div>

        <PriorityMeter value={opportunity.priorityScore} />

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={RECOMMENDATION_VARIANT[opportunity.recommendation]}>
            {RECOMMENDATION_LABEL[opportunity.recommendation]}
          </Badge>
          {isStudentBadge && (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 gap-1 shadow-sm"><IconStudent className="size-3" />{studentKind === "on-campus" ? "On-Campus" : studentKind === "internship" ? "Internship" : "Off-Campus"}</Badge>
          )}
          {opportunity.status !== "DISCOVERED" && (
            <Badge variant={OPPORTUNITY_STATUS_VARIANT[opportunity.status]}>
              {OPPORTUNITY_STATUS_LABEL[opportunity.status]}
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            Fit {opportunity.fitScore}
            {salary ? ` · ${salary}` : ""}
          </span>
        </div>

        {reason && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{reason}</p>
        )}

        <Button asChild size="sm" variant="outline" className="mt-auto w-full">
          <Link href={`/opportunities/${opportunity.id}`}>View analysis</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
