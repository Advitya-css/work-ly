import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-2xl border border-border bg-secondary px-6 py-16 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
          See where you actually stand
        </h2>
        <p className="max-w-md text-muted-foreground">
          Build your career profile and get a clear-eyed read on what you already qualify for , 
          and what to work on next.
        </p>
        <Button asChild size="lg">
          <Link href="/signup">
            Analyze My Career
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
