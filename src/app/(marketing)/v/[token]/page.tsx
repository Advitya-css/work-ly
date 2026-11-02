import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDashed, CircleSlash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { checkLink, SHARE_COPY, shareTitle, type ShareState } from "@/lib/share/verdict-core";
import { verifyVerdict } from "@/lib/share/verdict-token";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Work-ly checks a job against your resume and tells you straight: apply, stretch or skip, with a line from your resume behind every point. Free, no signup.";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const v = verifyVerdict(token);
  if (!v) return { title: "Not found", robots: { index: false } };
  const title = shareTitle(v);
  const image = { url: `/v/${token}/card.png`, width: 1200, height: 630, alt: title };
  return {
    title,
    description: DESCRIPTION,
    robots: { index: false, follow: true },
    openGraph: { title, description: DESCRIPTION, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION, images: [image.url] },
  };
}

const TONE = { good: "text-success", warn: "text-warning", bad: "text-destructive" } as const;
const ROW: Record<ShareState, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  met: { icon: CheckCircle2, tone: "text-success", label: "Shown on their resume" },
  partial: { icon: CircleDashed, tone: "text-warning", label: "Partly shown" },
  missing: { icon: CircleSlash, tone: "text-destructive", label: "Not shown yet" },
};

/**
 * A verdict someone shared. Shows what the card shows (never their resume)
 * and hands the visitor straight to the free check, with the sharer's
 * invite attached.
 */
export default async function SharedVerdictPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = verifyVerdict(token);
  if (!v) notFound();
  const copy = SHARE_COPY[v.r];

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image src="/workly-bot-face.png" alt="" width={88} height={88} className="size-20 object-contain motion-safe:animate-[bob_3s_ease-in-out_infinite]" priority />
        <p className="text-sm font-medium text-muted-foreground">Someone checked a job with Work-ly and shared the answer</p>
      </div>

      <article className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_1px_2px_rgb(28_26_25/0.05),0_16px_40px_-16px_rgb(122_46_85/0.18)]">
        <div className="flex flex-col gap-1.5 border-b border-border px-6 py-6 sm:px-8">
          {v.t && (
            <p className="text-[15px] font-semibold text-foreground">
              {v.t}
              {v.c && <span className="font-normal text-muted-foreground"> · {v.c}</span>}
            </p>
          )}
          <div className="flex items-end justify-between gap-4">
            <p className={cn("text-[40px] font-semibold leading-none tracking-[-0.04em]", TONE[copy.tone])}>{copy.word}</p>
            {v.s != null && (
              <p className="shrink-0 text-sm text-muted-foreground">
                Fit <span className="text-2xl font-semibold tabular-nums text-foreground">{v.s}</span>/100
              </p>
            )}
          </div>
        </div>
        {v.q.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {v.q.map((row) => {
              const r = ROW[row.k];
              return (
                <li key={row.x} className="flex gap-3 px-6 py-3.5 sm:px-8">
                  <r.icon className={cn("mt-0.5 size-[18px] shrink-0", r.tone)} aria-label={r.label} />
                  <span className="text-[14.5px] leading-snug text-foreground">{row.x}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-border bg-secondary/60 px-6 py-3 text-xs text-muted-foreground sm:px-8">
          A shared card shows the job and the verdict only. The resume behind it stays private.
        </p>
      </article>

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Got a job you&apos;re unsure about?
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">
          Paste it with your resume. Work-ly tells you straight whether it&apos;s worth applying, and proves it with lines from your own resume.
        </p>
        <Button asChild size="lg" className="mt-2 gap-2">
          <Link href={checkLink(v)}>
            Check my job, free
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">No signup needed.</p>
      </div>
    </div>
  );
}
