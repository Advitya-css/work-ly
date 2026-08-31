import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { StudentJobList } from "@/components/student/student-job-list";
import { LegalNote, LegalDisclaimer } from "@/components/student/legal-note";
import { StudentAutoDiscoveryCard } from "@/components/student/student-auto-discovery-card";
import { EmptyState } from "@/components/shared/empty-state";
import { IllustrationSearching } from "@/components/shared/empty-illustration";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { classifyStudentJob, limitsFor, rulesForCountry } from "@/lib/student/legal-limits";
import type { OpportunityWithJob } from "@/lib/db/types";

export const metadata: Metadata = { title: "Campus jobs" };

export default async function StudentJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, opportunities] = await Promise.all([
    getCareerProfileByUserId(user.id),
    listOpportunitiesWithJobByUserId(user.id),
  ]);

  const country = profile?.studentCountry ?? null;
  const rules = rulesForCountry(country);

  const onCampus: OpportunityWithJob[] = [];
  const offCampus: OpportunityWithJob[] = [];
  for (const opportunity of opportunities) {
    const kind = classifyStudentJob({
      title: opportunity.job.title,
      company: opportunity.job.company,
      employmentType: opportunity.job.employmentType,
      description: opportunity.job.description,
      location: opportunity.job.location,
      university: profile?.university ?? null,
    });
    if (kind === "on-campus") onCampus.push(opportunity);
    else if (kind === "off-campus") offCampus.push(opportunity);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Campus jobs"
        description="Split by where the work is, because that is what decides which rules apply to it."
      />

      <SectionTabs section="student" />

      {!country && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">
            Work-ly does not know where you study, so it is not showing any work-hour limits.
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Those rules are national, and showing the wrong country&apos;s would be worse than showing
            none.{" "}
            <Link href="/student" className="font-medium text-primary underline underline-offset-4">
              Set your country
            </Link>
          </p>
        </div>
      )}

      {rules?.unverified && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Work-ly could not confirm {rules.label} hour limits from an official page, so the notes below
          link to the source instead of printing a figure. Repeating a number it cannot cite is not
          something this product does.
        </p>
      )}

      <JobGroup
        title="On campus"
        blurb="Roles advertised by your university or by campus services."
        opportunities={onCampus}
        limits={limitsFor(country, "on-campus")}
        emptyHint="Nothing yet. Campus roles are often only listed on your university's own jobs page, which you can add as a source."
      />

      <JobGroup
        title="Off campus"
        blurb="Everything else within reach of where you study."
        opportunities={offCampus}
        limits={limitsFor(country, "off-campus")}
        emptyHint="Nothing yet. Run Discover to pull in listings near you."
      />

      <StudentAutoDiscoveryCard type="part-time" />
      {country && <LegalDisclaimer />}
    </div>
  );
}

function JobGroup({
  title,
  blurb,
  opportunities,
  limits,
  emptyHint,
}: {
  title: string;
  blurb: string;
  opportunities: OpportunityWithJob[];
  limits: ReturnType<typeof limitsFor>;
  emptyHint: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{opportunities.length}</span>
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p>
      </div>

      {/* The limit sits above the group rather than on every row. Same
          information, read once instead of twenty times. */}
      {limits.map((limit) => (
        <LegalNote key={limit.headline} limit={limit} />
      ))}

      {opportunities.length === 0 ? (
        <EmptyState
          illustration={IllustrationSearching}
          title={`No ${title.toLowerCase()} roles yet`}
          description={emptyHint}
          action={{ label: "Go to Discover", href: "/discover" }}
        />
      ) : (
        <StudentJobList opportunities={opportunities} />
      )}
    </section>
  );
}
