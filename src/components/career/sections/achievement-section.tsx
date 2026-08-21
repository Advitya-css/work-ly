import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { AchievementDialog } from "@/components/career/sections/achievement-dialog";
import { DeleteAchievementButton } from "@/components/career/sections/delete-buttons";
import { formatMonthYear } from "@/lib/format";
import type { Achievement } from "@/lib/db/types";

export function AchievementSection({ achievements }: { achievements: Achievement[] }) {
  return (
    <Card id="achievements">
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
        <CardDescription>Awards, publications, and other notable results.</CardDescription>
        <CardAction>
          <AchievementDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No achievements added yet"
            description="Add an award or notable result, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {achievements.map((ach) => (
              <li key={ach.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">{ach.title}</p>
                  {formatMonthYear(ach.date) && (
                    <p className="text-xs text-muted-foreground">{formatMonthYear(ach.date)}</p>
                  )}
                  {ach.description && <p className="mt-1 text-sm text-foreground/80">{ach.description}</p>}
                  <SourceBadge source={ach.source} isUncertain={ach.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <AchievementDialog achievement={ach} />
                  <DeleteAchievementButton id={ach.id} label={ach.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
