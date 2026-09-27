import { Cpu, FileSearch, ShieldCheck, UserRoundCheck } from "lucide-react";

import { BUSINESS } from "@/lib/business";

/**
 * "Isn't this just another AI wrapper?" - answered with how Work-ly
 * actually works, each point true of the shipped product:
 *   quotes      -> lib/scoring/screen-core.ts (a verdict without a quote from the profile is downgraded)
 *   no invented -> lib/resume/tense.ts safeRewrite + the grounding checks on every rewrite
 *   model       -> lib/ai/quality-core.ts (Pro's key tools on the stronger model)
 *   data        -> the paid Gemini API, which doesn't train on requests (see /legal/privacy)
 */
const POINTS = [
  {
    icon: FileSearch,
    title: "Every verdict quotes your resume",
    body: "A requirement only counts as met when Work-ly can quote the line on your resume that proves it. No quote, no credit.",
  },
  {
    icon: UserRoundCheck,
    title: "It never adds skills you don't have",
    body: "Tailored resumes and cover letters are rewritten only from your real experience. Missing skills are listed as gaps and left out.",
  },
  {
    icon: Cpu,
    title: "Pro runs on Google's stronger model",
    body: "For Pro members, Fit checks, tailored resumes, cover letters and interview feedback run on Google's flagship Gemini Flash model, with the previous Flash model stepping in when it's busy.",
  },
  {
    icon: ShieldCheck,
    title: "Your resume isn't used to train AI",
    body: "Work-ly uses Google's paid Gemini API, which doesn't train on what you send. You can delete your data at any time.",
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="trust-heading" className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            How Work-ly scores you
          </h2>
          <p className="mt-3 text-balance text-muted-foreground">
            Candidate Fit measures how well your resume shows a job&apos;s requirements. It is not a hiring guarantee,
            and it never guesses.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="size-4.5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <figure className="mx-auto mt-14 max-w-2xl border-l-2 border-primary pl-5 sm:pl-6">
          <blockquote className="text-lg leading-relaxed text-foreground text-pretty">
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
        </figure>
      </div>
    </section>
  );
}
