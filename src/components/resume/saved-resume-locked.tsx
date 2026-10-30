import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import type { TailoredResume } from "@/lib/resume/tailored-resume-core";

/**
 * A resume Work-ly already wrote for this job (during the trial, or on a
 * plan that has since ended). It's still theirs to see: the top of the page
 * is readable, the rest is blurred until they're on Pro again, and nothing
 * is thrown away in the meantime.
 */
export function SavedResumeLocked({
  resume,
  name,
  headline,
  contact,
  jobLabel,
}: {
  resume: TailoredResume;
  name: string;
  headline: string | null;
  contact: string;
  jobLabel: string;
}) {
  const firstRole = resume.roles[0];
  const rest = resume.roles.slice(1);
  const lines = resume.roles.reduce((n, r) => n + r.bullets.filter(Boolean).length, 0);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="relative mx-auto w-full max-w-[816px] min-w-0 overflow-hidden rounded-md border border-border bg-white px-6 py-8 text-[13px] leading-relaxed text-neutral-900 shadow-sm sm:px-10 sm:py-10">
        <header className="border-b border-neutral-300 pb-3">
          <p className="text-2xl font-semibold tracking-tight">{resume.header?.name ?? (name || "Your Name")}</p>
          {(resume.header?.headline ?? headline) && <p className="mt-0.5 text-sm text-neutral-700">{resume.header?.headline ?? headline}</p>}
          <p className="mt-1 text-xs text-neutral-600">{resume.header?.contact ?? contact}</p>
        </header>
        {resume.summary && (
          <section className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Summary</p>
            <p className="mt-1">{resume.summary}</p>
          </section>
        )}
        {firstRole && (
          <section className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Experience</p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="font-semibold">
                {firstRole.title}
                <span className="font-normal text-neutral-700"> · {firstRole.company}</span>
              </p>
              <p className="text-xs tabular-nums text-neutral-600">{firstRole.dates}</p>
            </div>
            <ul className="mt-1 list-disc pl-5">
              {firstRole.bullets.filter(Boolean).slice(0, 1).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        )}
        <div aria-hidden className="pointer-events-none mt-1 select-none blur-[5px]">
          <ul className="list-disc pl-5">
            {firstRole?.bullets.filter(Boolean).slice(1).map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          {rest.map((role, i) => (
            <div key={i} className="mt-3">
              <p className="font-semibold">
                {role.title} · {role.company}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {role.bullets.filter(Boolean).map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
          {resume.skills.length > 0 && <p className="mt-4">{resume.skills.join(" · ")}</p>}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
      </div>

      <aside className="flex w-full flex-col gap-3 feature-panel p-5 lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-4 text-primary" aria-hidden />
          Your resume for {jobLabel} is saved
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {lines} lines written for this job from your own experience. Pick up where you left off: edit it, download it
          as PDF or Word, and build one for every job you apply to.
        </p>
        <UpgradeModal title="Keep your tailored resumes" defaultPlan="quarterly">
          <Button className="w-full">Unlock my resume</Button>
        </UpgradeModal>
      </aside>
    </div>
  );
}
