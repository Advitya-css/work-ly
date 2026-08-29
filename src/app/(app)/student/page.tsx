import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { StudentSetupForm } from "@/components/student/student-setup-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentAutoDiscoveryCard } from "@/components/student/student-auto-discovery-card";
import { IconStudent } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { classifyStudentJob, rulesForCountry } from "@/lib/student/legal-limits";
import { listSupportedStudentCountries } from "@/lib/student/country-rules-db";
import { AddUniversityFeedForm } from "@/components/student/add-university-feed-form";

export const metadata: Metadata = { title: "Student home" };

export default async function StudentHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, opportunities, countries] = await Promise.all([
    getCareerProfileByUserId(user.id),
    listOpportunitiesWithJobByUserId(user.id),
    listSupportedStudentCountries(),
  ]);

  const classified = opportunities.map((o) =>
    classifyStudentJob({
      title: o.job.title,
      company: o.job.company,
      employmentType: o.job.employmentType,
      description: o.job.description,
      location: o.job.location,
      university: profile?.university ?? null,
    }),
  );
  const counts = {
    onCampus: classified.filter((k) => k === "on-campus").length,
    offCampus: classified.filter((k) => k === "off-campus").length,
    internship: classified.filter((k) => k === "internship").length,
  };

  const isSetUp = Boolean(profile?.university && profile?.studentCountry);
  const rules = rulesForCountry(profile?.studentCountry ?? null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Student home"
        description="Manage campus jobs and internships."
      />

      <SectionTabs section="student" />

      <Card>
        <CardHeader>
          <CardTitle>{isSetUp ? "Your details" : "Start here"}</CardTitle>
          <CardDescription>
            {isSetUp
              ? "Update your location and university to refine AI discoveries."
              : "Set your university and location to unlock local campus jobs."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <StudentSetupForm profile={profile} countries={countries} />
        </CardContent>
      </Card>

      {isSetUp && (
        <Card>
          <CardHeader>
            <CardTitle>Add your university&apos;s job feed</CardTitle>
            <CardDescription>
              Many universities publish a public vacancies feed for on-campus and student roles. Add
              yours and it feeds straight into Discover and the lists below, alongside everything else
              Workly watches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUniversityFeedForm />
          </CardContent>
        </Card>
      )}

      {isSetUp && (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile
            href="/student/jobs"
            label="On campus"
            count={counts.onCampus}
            note={rules ? `${rules.label} rules shown` : undefined}
          />
          <SummaryTile href="/student/jobs" label="Off campus" count={counts.offCampus} />
          <SummaryTile href="/student/internships" label="Internships" count={counts.internship} />
        </div>
      )}

      {isSetUp && counts.onCampus + counts.offCampus + counts.internship === 0 ? (
        <StudentAutoDiscoveryCard type="part-time" />
      ) : null}
    </div>
  );
}

function SummaryTile({
  href,
  label,
  count,
  note,
}: {
  href: string;
  label: string;
  count: number;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconStudent className="size-4" />
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground">{count}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </Link>
  );
}
