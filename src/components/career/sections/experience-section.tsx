import { Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { ExperienceDialog } from "@/components/career/sections/experience-dialog";
import { DeleteExperienceButton } from "@/components/career/sections/delete-buttons";
import { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";
import { formatDateRange } from "@/lib/format";
import type { Experience } from "@/lib/db/types";

export function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  return (
    <Card id="experience">
      <CardHeader>
        <CardTitle>Experience</CardTitle>
        <CardAction>
          <ExperienceDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {experiences.length === 0 ? (
          <EmptyState
            compact
            icon={Briefcase}
            title="No experience added yet"
            description="Add a role you've held, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {experiences.map((exp) => (
              <li key={exp.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                    {exp.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[exp.company, exp.location].filter(Boolean).join(" · ")}
                  </p>
                  {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                    </p>
                  )}
                  {exp.description && <DescriptionLines text={exp.description} />}
                  <SourceBadge source={exp.source} isUncertain={exp.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {exp.isUncertain && <ConfirmEntityButton id={exp.id} type="experience" />}
                  <ExperienceDialog experience={exp} />
                  <DeleteExperienceButton id={exp.id} label={`${exp.title} at ${exp.company}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** A role's description as tidy bullet points (one per line of the CV). */
function DescriptionLines({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length <= 1) return <p className="mt-1 text-sm leading-relaxed text-foreground/80">{lines[0] ?? text}</p>;
  return (
    <ul className="mt-1.5 flex flex-col gap-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/80">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
