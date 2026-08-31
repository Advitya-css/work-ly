import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:px-6 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)] opacity-70"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Career intelligence, not another job board
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Work-ly: Stop searching for jobs.
          <br />
          Start finding the right ones.
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Work-ly is an AI co-pilot that understands your career, discovers opportunities you would otherwise miss, and
          tells you exactly what to do to get hired.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Analyze My Career
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">See How It Works</a>
          </Button>
        </div>
      </div>

      <div className="mt-16">
        <ProductPreview />
      </div>
    </section>
  );
}
