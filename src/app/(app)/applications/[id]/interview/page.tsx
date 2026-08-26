import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { PageHeader } from "@/components/shared/page-header";
import { HotSeatClient } from "./hot-seat-client";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolved = await params;
  const application = await getApplicationWithJobById(user.id, resolved.id);
  if (!application) redirect("/applications");

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-12">
      <PageHeader
        title={`Interview Prep: ${application.roleTitle}`}
        description={`Practicing for ${application.company || "Unknown Company"}`}
      />
      <HotSeatClient applicationId={application.id} />
    </div>
  );
}
