import Image from "next/image";

import { FoundingBanner } from "@/components/marketing/founding-banner";
import { SaleBanner } from "@/components/marketing/sale-banner";
import { LiveCheck } from "@/components/landing/live-check";
import type { PublicFoundingOffer } from "@/lib/payments/founding-core";
import type { PublicSale } from "@/lib/payments/sale-core";

/** What happens, in the order it happens, for someone who's never heard of Work-ly. */
const STEPS = [
  { title: "Paste a job you're thinking about", body: "And your resume, as text. No account needed." },
  { title: "Get a straight answer", body: "Apply, stretch or skip, with a line from your resume behind every point." },
  { title: "If it's a yes, we write it", body: "The resume, cover letter and interview prep for that one job." },
];

/**
 * The homepage leads with the one thing a visitor can do in 30 seconds
 * without an account: ask whether a job is worth applying to. The check
 * itself sits in the hero, under three plain steps so a first-time visitor
 * knows what's about to happen.
 */
export function Hero({ offer, sale = null }: { offer: PublicFoundingOffer | null; sale?: PublicSale | null }) {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)] opacity-80"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {sale ? <SaleBanner sale={sale} className="mb-6" /> : <FoundingBanner offer={offer} className="mb-6" />}
        <span className="mb-5 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Your honest job coach · free, no signup
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
          Apply to fewer jobs.
          <br />
          <span className="text-primary">Get more yeses.</span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Work-ly tells you straight whether a job is worth your evening, and proves it with lines from your own resume.
          If it&apos;s a no, it says so.
        </p>
      </div>

      <ol className="mx-auto mt-10 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-xl border border-border bg-card/70 p-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">{step.title}</span>
              <span className="text-[13px] leading-snug text-muted-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div id="check" className="relative mx-auto mt-16 max-w-4xl scroll-mt-24">
        {/* The Work-ly robot, peeking over the check with the promise in its own words. */}
        <div className="pointer-events-none absolute -top-12 right-4 z-10 flex items-end gap-2 sm:right-8" aria-hidden>
          <span className="mb-6 hidden rounded-2xl rounded-br-sm border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm sm:block">
            Paste a job. I&apos;ll be honest.
          </span>
          <Image src="/workly-bot-face.png" alt="" width={84} height={84} className="size-14 object-contain drop-shadow-sm sm:size-[72px]" priority />
        </div>
        <LiveCheck />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Free · no account needed · one check per device without signing up
        </p>
      </div>
    </section>
  );
}
