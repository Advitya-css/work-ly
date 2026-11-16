import { FoundingBanner } from "@/components/marketing/founding-banner";
import { SaleBanner } from "@/components/marketing/sale-banner";
import { LiveCheck } from "@/components/landing/live-check";
import type { PublicFoundingOffer } from "@/lib/payments/founding-core";
import type { PublicSale } from "@/lib/payments/sale-core";

/**
 * The first screen answers three questions without scrolling: what is this
 * (one sentence), what do I do (two boxes and a button), and what do I get
 * (a real verdict, already on screen). Everything else on the page comes
 * after someone has seen that.
 */
export function Hero({ offer, sale = null }: { offer: PublicFoundingOffer | null; sale?: PublicSale | null }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)] opacity-80"
      />
      <LiveCheck
        offer={offer}
        heading={
          <div className="mb-6 flex flex-col items-center text-center lg:items-start lg:text-left">
            {sale ? (
              <SaleBanner sale={sale} className="mb-5" />
            ) : (
              <FoundingBanner offer={offer} className="mb-5" />
            )}
            <h1 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[52px]">
              Apply to fewer jobs.
              <br />
              <span className="text-primary">Get more yeses.</span>
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-[17px] leading-relaxed text-muted-foreground">
              Paste a job and your resume. Work-ly tells you straight whether to{" "}
              <strong className="font-semibold text-foreground">apply, stretch or skip</strong>, and proves it with lines
              from your own resume.
            </p>
          </div>
        }
      />
    </section>
  );
}
