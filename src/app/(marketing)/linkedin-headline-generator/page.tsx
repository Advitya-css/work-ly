import type { Metadata } from "next";

import { HeadlineTool } from "./headline-tool";

const TITLE = "Free LinkedIn headline generator";
const DESCRIPTION =
  "Write a LinkedIn headline recruiters actually search for. Paste your experience and get three honest headline options in seconds. Free, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/linkedin-headline-generator" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const TIPS = [
  {
    title: "Lead with the title you hold",
    body: "Recruiters search LinkedIn by job title first. Put your real title at the start, not a slogan, so you show up when they search for it.",
  },
  {
    title: "Add one result, with a number if you have one",
    body: "\"Built the dashboards 120 managers use\" says more than \"data enthusiast\". A single concrete result is what makes someone click.",
  },
  {
    title: "Use the words recruiters type",
    body: "Name the tools and skills your field is searched by (SQL, Figma, Salesforce, Python). Those words are how the right searches find you.",
  },
  {
    title: "Point at the next role honestly",
    body: "\"Moving into product management\" or \"focused on data engineering\" signals where you're going without claiming a title you don't have yet.",
  },
];

const FAQ = [
  {
    q: "How long can a LinkedIn headline be?",
    a: "Up to 220 characters. Only the first part shows in search results and comments, so the most important words should come first.",
  },
  {
    q: "Should I put my target job title in my headline?",
    a: "Only if you hold it. If you're moving toward a role, say so (\"moving into\", \"focused on\") and lead with your real title. Claiming a title you haven't held tends to fall apart at the first screening call.",
  },
  {
    q: "Is this really free?",
    a: "Yes. The headline generator is free with no account. Work-ly Pro also rewrites your About section, picks the skills to pin, and tailors your resume to each job you apply to.",
  },
  {
    q: "What happens to what I paste?",
    a: "It's sent to our AI provider to write your headlines, and Work-ly doesn't save it or add it to an account.",
  },
];

export default function LinkedInHeadlineGeneratorPage() {
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
          Three headline options built from what you&apos;ve actually done, in the words recruiters search for.
        </p>
      </header>

      <HeadlineTool />

      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">What makes a headline work</h2>
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
