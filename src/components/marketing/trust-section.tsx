import Image from "next/image";
import { FileSearch, ShieldCheck, UserRoundCheck } from "lucide-react";

import { BUSINESS } from "@/lib/business";

/**
 * "Can I trust what it says?" - three promises, each true of the shipped
 * product, then the founder saying why it exists:
 *   quotes      -> lib/scoring/screen-core.ts (a verdict without a quote from the resume is downgraded)
 *   no invented -> lib/resume/tense.ts safeRewrite + the grounding checks on every rewrite
 *   data        -> the paid Gemini API, which doesn't train on requests (see /legal/privacy)
 */
const POINTS = [
  {
    icon: FileSearch,
    title: "Every point quotes your resume",
    body: "A requirement only counts as met when Work-ly can show the line that proves it.",
  },
  {
    icon: UserRoundCheck,
    title: "It never invents experience",
    body: "Rewrites come from lines you wrote. Numbers are checked. Gaps stay gaps.",
  },
  {
    icon: ShieldCheck,
    title: "Your resume stays yours",
    body: "It isn't used to train AI, and you can delete your data whenever you like.",
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="border-y border-border bg-secondary/50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 id="trust-heading" className="text-balance text-center text-3xl font-semibold tracking-tight text-foreground">
          Honest, even when the answer is no
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-1 font-semibold text-foreground">{p.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>

        <figure className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
          <Image src="/workly-bot-face.png" alt="" width={96} height={96} className="size-20 shrink-0 object-contain" />
          <div>
            <blockquote className="text-pretty text-[17px] leading-relaxed text-foreground">
              I built Work-ly after watching friends and family send hundreds of applications and hear nothing back. No
              reply, and no reason why. Work-ly tells you why before you apply, using only what&apos;s really on your
              resume.
            </blockquote>
            <figcaption className="mt-3 text-sm text-muted-foreground">
              {BUSINESS.operator}, founder ·{" "}
              <a href={`mailto:${BUSINESS.supportEmail}`} className="underline underline-offset-4 hover:text-foreground">
                {BUSINESS.supportEmail}
              </a>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
