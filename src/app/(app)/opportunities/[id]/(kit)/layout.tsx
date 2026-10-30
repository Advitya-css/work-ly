import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { displayJobTitle } from "@/lib/format";
import { loadKit } from "@/lib/kit/kit-data";
import { KIT_ITEMS, KIT_LABEL, KIT_PATH } from "@/lib/kit/kit-items";
import { KitTabs } from "@/components/kit/kit-tabs";
import { KitBuildAll } from "@/components/kit/kit-build-all";
import { KitLabel } from "@/components/kit/kit-parts";
import { MatchMeter } from "@/components/kit/match-meter";

/**
 * THE APPLICATION KIT for one job: the resume, cover letter, note to the
 * hiring manager and interview prep, side by side under one header that
 * says how well the resume answers the posting and what's still unwritten.
 */
export default async function KitLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const kit = await loadKit(user.id, id);
  // loadKit already scopes to this user; checked again here so it reads at a glance.
  if (!kit || kit.opportunity.userId !== user.id) notFound();

  const { job, ready, match } = kit;
  const title = job.title ? displayJobTitle(job.title) : "This role";
  const readyCount = KIT_ITEMS.filter((k) => ready[k]).length;
  const missing = KIT_ITEMS.filter((k) => !ready[k]);
  const base = `/opportunities/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 print:hidden">
        <Link
          href={base}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to the job
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <KitLabel>Application kit</KitLabel>
            <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground">
              {title}
              {job.company && <span className="text-muted-foreground"> at {job.company}</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.isPro
                ? `${readyCount} of 4 written. Every line comes from your profile, and your edits save as you go.`
                : readyCount > 0
                  ? `${readyCount} of 4 written and saved in your account. Pro opens them again.`
                  : "Everything you send for this job, written from your real experience."}
            </p>
            {user.isPro && missing.length > 0 && (
              <div className="mt-3">
                <KitBuildAll opportunityId={id} missing={missing} />
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs lg:w-80 lg:shrink-0">
            {match ? (
              <MatchMeter
                label={<KitLabel>Resume match</KitLabel>}
                size="sm"
                score={match.now.score}
                before={match.before}
                mustShown={match.now.mustShown}
                mustTotal={match.now.mustTotal}
              />
            ) : (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                <KitLabel className="mb-1 block">Resume match</KitLabel>
                Once the resume is written, this shows how much of the posting it answers, measured requirement by
                requirement.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="print:hidden">
        <KitTabs
          locked={!user.isPro}
          tabs={KIT_ITEMS.map((k) => ({ href: `${base}/${KIT_PATH[k]}`, label: KIT_LABEL[k], ready: ready[k] }))}
        />
      </div>

      {children}
    </div>
  );
}
