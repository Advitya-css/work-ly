import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { getSavedOutput } from "@/lib/saved-outputs";
import { KitLabel } from "@/components/kit/kit-parts";
import { HotSeatClient, type PreparedQuestion } from "./hot-seat-client";

export const metadata: Metadata = { title: "Mock interview" };

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ id }, { q }] = await Promise.all([params, searchParams]);
  const application = await getApplicationWithJobById(user.id, id);
  if (!application) redirect("/applications");
  // Pro feature: the API also refuses free accounts, this just avoids a dead page.
  if (!user.isPro) redirect(`/applications/${application.id}`);

  // The questions already prepared in this job's kit, if any: practise those.
  let prepared: PreparedQuestion[] = [];
  if (application.opportunityId) {
    const saved = await getSavedOutput<{ questions?: PreparedQuestion[] }>(user.id, "interview", application.opportunityId).catch(() => null);
    prepared = (saved?.data.questions ?? [])
      .filter((x) => typeof x?.question === "string" && x.question.trim())
      .map((x) => ({ question: x.question, answerFrom: x.answerFrom ?? null, outline: Array.isArray(x.outline) ? x.outline : [] }));
  }
  const startAt = Number.parseInt(q ?? "0", 10);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12">
      <Link
        href={application.opportunityId ? `/opportunities/${application.opportunityId}/prep` : `/applications/${application.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {application.opportunityId ? "Back to interview prep" : "Back to the application"}
      </Link>
      <div className="flex flex-col gap-1.5">
        <KitLabel>Mock interview</KitLabel>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground">
          {application.roleTitle}
          {application.company && <span className="text-muted-foreground"> at {application.company}</span>}
        </h1>
      </div>
      <HotSeatClient applicationId={application.id} prepared={prepared} startAt={Number.isFinite(startAt) ? startAt : 0} />
    </div>
  );
}
