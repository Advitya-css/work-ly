import type { Metadata } from "next";

import { BulletTool } from "./bullet-tool";

const TITLE = "Free resume bullet point generator";
const DESCRIPTION =
  "Rewrite a resume bullet so it shows results, not duties. Paste one line and get three honest rewrites that keep your numbers. Free, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resume-bullet-point-generator" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const TIPS = [
  {
    title: "Start with a strong past-tense verb",
    body: "\"Built\", \"cut\", \"led\", \"launched\". Not \"responsible for\" or \"helped with\", which describe a job, not what you did in it.",
  },
  {
    title: "Show the result",
    body: "What changed because you did it? Time saved, money made, errors removed, people served. A number makes it believable, if you have one.",
  },
  {
    title: "Use the job's words for what you really did",
    body: "If the posting says \"stakeholder reporting\" and your line says \"made reports for managers\", say it their way. Only where it's true.",
  },
  {
    title: "Never add what you didn't do",
    body: "A tool, a team size or a percentage you can't back up is the first thing an interviewer asks about. Keep every real number; invent none.",
  },
];

const FAQ = [
  {
    q: "How many bullet points should each job have?",
    a: "Three to five for your most recent or most relevant role, two to three for older ones. Lead with the lines that matter most for the job you're applying for.",
  },
  {
    q: "What if my line has no number?",
    a: "Don't invent one. Make the action and its purpose clear instead (\"Rebuilt the onboarding checklist so new hires could start without a manager present\"). The rewriter never adds numbers.",
  },
  {
    q: "Will this get past applicant tracking systems?",
    a: "ATS software matches the words a job uses. Rewriting your real experience in the posting's language helps it match; keyword stuffing with skills you don't have doesn't survive the interview.",
  },
  {
    q: "What happens to what I paste?",
    a: "It's sent to our AI provider to write the rewrites, and Work-ly doesn't save it or add it to an account.",
  },
];

export default function ResumeBulletGeneratorPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Free tool · No account needed
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{TITLE}</h1>
        <p className="max-w-2xl text-balance text-lg text-muted-foreground">
          Turn a line that lists duties into one that shows what you achieved, without adding anything you didn&apos;t do.
        </p>
      </header>

      <BulletTool />

      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">What makes a bullet work</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TIPS.map((t) => (
            <li key={t.title} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground">{t.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Questions</h2>
        <dl className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {FAQ.map((f) => (
            <div key={f.q} className="flex flex-col gap-1.5 p-5">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
