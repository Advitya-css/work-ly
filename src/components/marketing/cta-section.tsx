import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-2xl border border-border bg-secondary px-6 py-16 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
          Check the next job before you apply
        </h2>
        <p className="max-w-md text-balance text-muted-foreground">
          Paste the job and your resume. See what you already prove and what would get you screened out. Free, no
          signup for the first check.
        </p>
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/free-grader">
              Check a job free
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
