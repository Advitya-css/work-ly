import type { Metadata } from "next";
import { MapPin, Briefcase, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconGoal } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { IllustrationPathway } from "@/components/shared/empty-illustration";
import { NewCareerGoalDialog } from "@/components/career/new-career-goal-dialog";
import { DeleteCareerGoalButton } from "@/components/career/delete-career-goal-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { formatSalaryRange } from "@/lib/format";
import { WORK_MODE_LABEL, EMPLOYMENT_TYPE_LABEL, SENIORITY_LABEL } from "@/lib/jobs/labels";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Career Goals" };

const statusVariant = {
  ACTIVE: "default",
  ACHIEVED: "success",
  PAUSED: "warning",
  ARCHIVED: "outline",
} as const;

export default async function CareerGoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [goals, profile] = await Promise.all([
    listCareerGoalsByUserId(user.id),
    getCareerProfileByUserId(user.id),
  ]);
  const homeLocation = profile?.location ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Career Goals"
        description="What you're working toward. This steers job analysis and, later, opportunity prioritization."
        action={<NewCareerGoalDialog homeLocation={homeLocation} />}
      />

      <SectionTabs section="career" />

      {goals.length === 0 ? (
        <EmptyState
          illustration={IllustrationPathway}
          title="No career goals yet"
          description="Add a goal to tell Workly what you're aiming for. A role, industries, locations, or just that you're still figuring it out."
        />
      ) : (
        <div className="stagger-children grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => {
            const salary = formatSalaryRange(goal.salaryMin, goal.salaryMax, goal.salaryCurrency);
            return (
              <Card key={goal.id}>
                <CardContent className="flex flex-col gap-2.5 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={statusVariant[goal.status]}>{goal.status.toLowerCase()}</Badge>
                      <NewCareerGoalDialog goal={goal} homeLocation={homeLocation} />
                      <DeleteCareerGoalButton id={goal.id} label={goal.title} />
                    </div>
                  </div>

                  {goal.isUncertain && (
                    <Badge variant="warning" className="w-fit">
                      <Sparkles />
                      Still figuring this out
                    </Badge>
                  )}

                  {(goal.primaryTargetRole || goal.secondaryTargetRoles.length > 0) && (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Briefcase className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {[goal.primaryTargetRole, ...goal.secondaryTargetRoles].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}

                  {(goal.preferredLocations.length > 0 || goal.countries.length > 0 || goal.workModes.length > 0) && (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {[
                          ...goal.preferredLocations,
                          ...goal.countries,
                          ...goal.workModes.map((m) => WORK_MODE_LABEL[m]),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  )}

                  {(goal.industries.length > 0 ||
                    goal.employmentTypes.length > 0 ||
                    goal.seniority ||
                    salary) && (
                    <div className="flex flex-wrap gap-1.5">
                      {goal.industries.map((industry) => (
                        <Badge key={industry} variant="secondary">
                          {industry}
                        </Badge>
                      ))}
                      {goal.employmentTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {EMPLOYMENT_TYPE_LABEL[type]}
                        </Badge>
                      ))}
                      {goal.seniority && <Badge variant="outline">{SENIORITY_LABEL[goal.seniority]}</Badge>}
                      {salary && <Badge variant="outline">{salary}</Badge>}
                    </div>
                  )}

                  {goal.timeframe && <p className="text-xs text-muted-foreground">{goal.timeframe}</p>}
                  {goal.notes && <p className="mt-1 text-sm text-foreground/80">{goal.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
