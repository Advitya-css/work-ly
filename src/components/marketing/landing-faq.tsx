import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { BUSINESS } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";

/**
 * The five things a careful visitor wants to know before pasting their
 * resume into a site they met a minute ago. Plain <details>, so it works
 * without JavaScript and search engines can read the answers.
 */
export function LandingFaq() {
  const monthly = PAID_PLANS.find((p) => p.interval === "monthly");
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly");
  const faq = [
    {
      q: "Is the check really free?",
      a: "Yes. Your first check needs no account at all. With a free account you can check up to 15 jobs a day, and Work-ly finds jobs that fit your resume and tracks your applications.",
    },
    {
      q: "Will it make things up on my resume?",
      a: "No. Every rewritten line has to come from a line you wrote, and every number is checked against your original. If the job asks for something you don't have, Work-ly says so instead of covering it up.",
    },
    {
      q: "What happens to my resume?",
      a: "It's read to give you your answer. It isn't used to train AI and it's never sold or shown to employers. A check without an account isn't saved to an account; with one, you can delete your data in Settings at any time.",
    },
    {
      q: "What if Work-ly tells me to skip a job I want?",
      a: "Then you'll know exactly why: it shows which must-haves your resume doesn't prove and how to close each one. It's your call. Sometimes the fix is one missing line on your resume.",
    },
    {
      q: "What does Pro cost, and can I get my money back?",
      a: `${pass?.price ?? "$49.99"} once for 3 months, or ${monthly?.price ?? "$19.99"} a month. If it isn't for you, email within ${BUSINESS.refundDays} days of your first purchase for a full refund, as long as you've used fewer than ${BUSINESS.refundUsageLimit} Pro AI tools.`,
    },
  ];
  return (
    <section aria-labelledby="faq-heading" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 id="faq-heading" className="text-center text-3xl font-semibold tracking-tight text-foreground">
          Before you paste your resume
        </h2>
        <div className="mt-8 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {faq.map((f) => (
            <details key={f.q} className="group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Something else?{" "}
          <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
            Ask the founder
          </Link>
          . He answers himself.
        </p>
      </div>
    </section>
  );
}
