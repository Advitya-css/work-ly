import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBanner } from "@/components/marketing/founding-banner";
import { SampleReport } from "@/components/marketing/sample-report";
import type { PublicFoundingOffer } from "@/lib/payments/founding-core";

/**
 * The homepage leads with the one thing a visitor can do in 30 seconds
 * without an account: check their resume against a job. That promise used
 * to live only on /free-grader, linked from the footer.
 */
export function Hero({ offer }: { offer: PublicFoundingOffer | null }) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)] opacity-70"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <FoundingBanner offer={offer} className="mb-6" />
        <span className="mb-5 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Free check · no signup needed
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Would a recruiter shortlist you for this job?
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Paste a job and your resume. Work-ly checks every requirement, quotes the proof from your own resume, and
          tells you what would get you screened out, before you apply.
        </p>
        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/free-grader">
              Check a job free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/signup">Create free account</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">First check needs no account. Free account after that, no card.</p>
      </div>

      <div className="mt-14">
        <SampleReport />
      </div>
    </section>
  );
}
