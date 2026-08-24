import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { EducationDialog } from "@/components/career/sections/education-dialog";
import { DeleteEducationButton } from "@/components/career/sections/delete-buttons";
import { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";
import { formatDateRange } from "@/lib/format";
import type { Education } from "@/lib/db/types";

export function EducationSection({ educations }: { educations: Education[] }) {
  return (
    <Card id="education">
      <CardHeader>
        <CardTitle>Education</CardTitle>
        <CardDescription>Schools, degrees, and programs.</CardDescription>
        <CardAction>
          <EducationDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {educations.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No education added yet"
            description="Add your degrees and programs, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {educations.map((edu) => (
              <li key={edu.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">{edu.institution}</p>
                  {(edu.degree || edu.fieldOfStudy) && (
                    <p className="text-sm text-muted-foreground">
                      {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {formatDateRange(edu.startDate, edu.endDate) && (
                    <p className="text-xs text-muted-foreground">{formatDateRange(edu.startDate, edu.endDate)}</p>
                  )}
                  {edu.description && <p className="mt-1 text-sm text-foreground/80">{edu.description}</p>}
                  <SourceBadge source={edu.source} isUncertain={edu.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {edu.isUncertain && <ConfirmEntityButton id={edu.id} type="education" />}
                  <EducationDialog education={edu} />
                  <DeleteEducationButton id={edu.id} label={edu.institution} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
