import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SampleReport } from "@/components/marketing/sample-report";
import type { LandingPage } from "@/lib/landing-pages";

/**
 * One problem page: the honest answer first, then the free check that
 * makes it personal, with a real sample report in between.
 */
export function ProblemLanding({ page }: { page: LandingPage }) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <header className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {page.eyebrow}
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{page.title}</h1>
        <p className="max-w-2xl text-balance text-lg text-muted-foreground">{page.lead}</p>
        <div className="mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/free-grader">
              Check a job free
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">No account needed for the first check.</p>
        </div>
      </header>

      {page.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{section.heading}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {section.items.map((item) => (
              <li key={item.title} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">What the check looks like</h2>
        <SampleReport />
      </section>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-6 py-12 text-center">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{page.ctaTitle}</h2>
        <p className="max-w-xl text-balance text-muted-foreground">{page.ctaBody}</p>
        <Button asChild size="lg">
          <Link href="/free-grader">
            Check a job free
            <ArrowRight />
          </Link>
        </Button>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Questions</h2>
        <dl className="flex flex-col gap-4">
          {page.faq.map((f) => (
            <div key={f.q} className="flex flex-col gap-1">
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
