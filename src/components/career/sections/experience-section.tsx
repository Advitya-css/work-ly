import { Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { ExperienceDialog } from "@/components/career/sections/experience-dialog";
import { DeleteExperienceButton } from "@/components/career/sections/delete-buttons";
import { formatDateRange } from "@/lib/format";
import type { Experience } from "@/lib/db/types";

export function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  return (
    <Card id="experience">
      <CardHeader>
        <CardTitle>Experience</CardTitle>
        <CardDescription>Roles you&apos;ve held, in your own words.</CardDescription>
        <CardAction>
          <ExperienceDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {experiences.length === 0 ? (
          <EmptyState
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
                  {exp.description && (
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{exp.description}</p>
                  )}
                  <SourceBadge source={exp.source} isUncertain={exp.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
