import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-2xl border border-border bg-secondary px-6 py-16 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
          Got a job open in another tab?
        </h2>
        <p className="max-w-md text-balance text-muted-foreground">
          Find out in 30 seconds whether it&apos;s worth your evening. Free, no signup.
        </p>
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="#check">
              Check it now
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
            <Link href="/pricing">See Pro plans</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
