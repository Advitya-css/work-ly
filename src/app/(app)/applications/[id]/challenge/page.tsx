import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { PageHeader } from "@/components/shared/page-header";
import { ChallengeClient } from "./challenge-client";
import { isTechnicalRole } from "@/lib/role-kind";


export const metadata: Metadata = { title: "Practice task" };

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolved = await params;
  const application = await getApplicationWithJobById(user.id, resolved.id);
  if (!application) redirect("/applications");
  // Pro feature: the API also refuses free accounts, this just avoids a dead page.
  if (!user.isPro) redirect(`/applications/${application.id}`);

  const roleTitle = application.job?.title ?? application.roleTitle ?? "Professional";
  const isTechnical = isTechnicalRole(roleTitle, application.job?.industry ?? application.industry);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-12">
      <PageHeader
        title={isTechnical ? `Technical Sandbox: ${roleTitle}` : `Scenario Sandbox: ${roleTitle}`}
        description={`Domain-specific assignment for ${application.company || "Unknown Company"}`}
      />
      <ChallengeClient applicationId={application.id} isTechnical={isTechnical} />
    </div>
  );
}
