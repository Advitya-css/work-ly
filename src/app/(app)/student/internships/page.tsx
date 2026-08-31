import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { LegalNote, LegalDisclaimer } from "@/components/student/legal-note";
import { StudentAutoDiscoveryCard } from "@/components/student/student-auto-discovery-card";
import { EmptyState } from "@/components/shared/empty-state";
import { IllustrationStudent } from "@/components/shared/empty-illustration";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { classifyStudentJob, limitsFor } from "@/lib/student/legal-limits";
import { matchInternships, dreamGaps } from "@/lib/student/internship-match";

export const metadata: Metadata = { title: "Internships" };

export default async function InternshipsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, fullProfile, dreamJobs, opportunities] = await Promise.all([
    getCareerProfileByUserId(user.id),
    getFullCareerProfile(user.id),
    listDreamJobsByUserId(user.id),
    listOpportunitiesWithJobByUserId(user.id),
  ]);

  const dreamJob = dreamJobs.find((d) => d.status === "PARSED") ?? null;
  const dreamSkills = dreamJob ? [...dreamJob.requiredSkills, ...dreamJob.preferredSkills] : [];

  const internships = opportunities.filter(
    (o) =>
      classifyStudentJob({
        title: o.job.title,
        company: o.job.company,
        employmentType: o.job.employmentType,
        description: o.job.description,
      location: o.job.location,
        university: profile?.university ?? null,
      }) === "internship",
  );

  const hasResume = Boolean(fullProfile && fullProfile.skills.length > 0);
  const gaps = fullProfile ? dreamGaps(dreamSkills, fullProfile.skills) : [];

  const matches =
    fullProfile && dreamJob
      ? matchInternships({
          internships,
          dreamSkills,
          studentSkills: fullProfile.skills,
          major: profile?.major ?? null,
        })
      : [];

  const missingInputs = [
    !profile?.major && { label: "your field of study", href: "/student" },
    !hasResume && { label: "your CV", href: "/career-profile" },
    !dreamJob && { label: "a dream job", href: "/dream-job" },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Internships"
        description="Ranked by how much each one closes the distance to the job you want after graduating, not by which would be easiest to get."
      />

      <SectionTabs section="student" />

      {missingInputs.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            This screen needs three things, and it is missing {missingInputs.length}.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {missingInputs.map((item) => (
              <li key={item.href} className="text-sm text-muted-foreground">
                <Link href={item.href} className="font-medium text-primary underline underline-offset-4">
                  Add {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-sm text-muted-foreground">
            Without all three, Work-ly can list internships but cannot honestly tell you which ones move
            you toward anything.
          </p>
        </div>
      )}

      {dreamJob && gaps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">
            What stands between you and {dreamJob.title ?? dreamJob.dreamRole}
          </h2>
          <p className="text-sm text-muted-foreground">
            Skills that role asks for and your profile does not show yet. An internship that covers
            these is worth more to you than one that does not.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gaps.slice(0, 12).map((gap) => (
              <Badge key={gap} variant="secondary">
                {gap}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {limitsFor(profile?.studentCountry ?? null, "internship").map((limit) => (
        <LegalNote key={limit.headline} limit={limit} />
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Internships
          <span className="ml-2 text-sm font-normal text-muted-foreground">{internships.length}</span>
        </h2>

        {internships.length === 0 ? (
          <EmptyState
            illustration={IllustrationStudent}
            title="No internships yet"
            description="Run Discover, or analyze one you found yourself, and anything marked as an internship lands here."
            action={{ label: "Go to Discover", href: "/discover" }}
          />
        ) : matches.length === 0 ? (
          <ul className="flex flex-col gap-2">
            {internships.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {o.job.title ?? "Untitled role"}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {[o.job.company, o.job.location].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.map((match) => (
              <li key={match.opportunity.id}>
                <Link
                  href={`/opportunities/${match.opportunity.id}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {match.opportunity.job.title ?? "Untitled role"}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {[match.opportunity.job.company, match.opportunity.job.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-semibold text-foreground">
                        {match.closesGaps.length}
                      </span>
                      <span className="block text-xs text-muted-foreground">gaps closed</span>
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {match.reasoning}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StudentAutoDiscoveryCard type="internship" />

      {profile?.studentCountry && <LegalDisclaimer />}
    </div>
  );
}
