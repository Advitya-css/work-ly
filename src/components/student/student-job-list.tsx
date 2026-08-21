import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CompanyMonogram } from "@/components/shared/company-monogram";
import { formatSalaryRange } from "@/lib/format";
import type { OpportunityWithJob } from "@/lib/db/types";

/**
 * A deliberately thin job row, with one visual anchor.
 *
 * The full opportunity card carries a monogram, a meter, badges and a
 * reason line. Stacked twenty deep in a list that is a wall, so this row
 * keeps only what you need to decide whether to open it: who it is with,
 * what it is, where, what it pays. The monogram stays because it is what
 * makes a long list scannable rather than uniform; everything else is one
 * click away on the analysis page.
 */
export function StudentJobRow({ opportunity }: { opportunity: OpportunityWithJob }) {
  const { job } = opportunity;
  const pay = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <li>
      <Link
        href={`/opportunities/${opportunity.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-sm"
      >
        <CompanyMonogram name={job.company} size="sm" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {job.title ?? "Untitled role"}
          </span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
            {job.company ?? "Unknown company"}
            {job.location && (
              <>
                <MapPin className="ml-1 size-3 shrink-0" />
                <span className="truncate">{job.location}</span>
              </>
            )}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {pay && <span className="hidden text-sm text-muted-foreground sm:inline">{pay}</span>}
          <Badge variant="secondary">{opportunity.priorityScore}</Badge>
        </span>
      </Link>
    </li>
  );
}

export function StudentJobList({ opportunities }: { opportunities: OpportunityWithJob[] }) {
  return (
    <ul className="stagger-children flex flex-col gap-2">
      {opportunities.map((opportunity) => (
        <StudentJobRow key={opportunity.id} opportunity={opportunity} />
      ))}
    </ul>
  );
}
