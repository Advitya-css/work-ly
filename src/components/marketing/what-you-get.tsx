import type { ReactNode } from "react";
import { CheckCircle2, Mail, MessagesSquare, PenLine } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * WHAT HAPPENS AFTER THE VERDICT, shown rather than described: three
 * pictures of real output shapes (the same sample resume as the example
 * report in the hero), each with one sentence. It replaces two separate
 * step lists that said the same thing in different words.
 */

function Example({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <span className="absolute -top-2.5 left-4 z-10 rounded-full border border-border bg-card px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Example
      </span>
      {children}
    </div>
  );
}

function ResumeRewrite() {
  return (
    <Example>
      <div className="rounded-xl border border-border bg-white p-6 text-neutral-900 shadow-[0_20px_50px_-28px_rgb(28_26_25/0.4)] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">The posting asks for</p>
        <p className="mt-1 text-[14px] font-medium">&ldquo;Proficiency in SQL, Python, data modeling and semantic layer&rdquo;</p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Your line</p>
        <p className="mt-1 text-[14px] leading-relaxed text-neutral-400 line-through decoration-[#b3261e]/70 decoration-2">
          Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.
        </p>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a2e55]">Rewritten for this job</p>
        <p className="mt-1 text-[15px] font-medium leading-relaxed">
          Built <mark className="rounded-sm bg-[#f6d6e6] px-0.5 text-inherit">40+ dbt data models</mark> on BigQuery behind the
          delivery-ops dashboards that <mark className="rounded-sm bg-[#f6d6e6] px-0.5 text-inherit">120 city managers</mark> use.
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-neutral-600">
          <CheckCircle2 className="size-3.5 text-[#116149]" aria-hidden />
          Same facts, the posting&apos;s words. Both numbers checked against your resume.
        </p>
      </div>
    </Example>
  );
}

function Kit() {
  const items = [
    {
      icon: PenLine,
      label: "Cover letter",
      text: "Your city teams open the same dashboards every morning. I built the 40+ data models behind dashboards like those for 120 city managers…",
    },
    {
      icon: Mail,
      label: "Note to the hiring manager",
      text: "I've just applied for the Data & Analytics Engineer role. One thing that may be relevant: I ran the checkout A/B test that lifted conversion 3.2%…",
    },
    {
      icon: MessagesSquare,
      label: "Interview prep",
      text: "Likely question: “Tell me about a model you had to redesign.” Your answer starts from the delivery-ops rebuild, with the numbers to mention.",
    },
  ];
  return (
    <Example>
      <ul className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li
            key={it.label}
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-[0_12px_30px_-20px_rgb(122_46_85/0.35)]",
              i === 1 && "sm:ml-8",
              i === 2 && "sm:ml-16",
            )}
          >
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
              <it.icon className="size-3.5" aria-hidden />
              {it.label}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/90">{it.text}</p>
          </li>
        ))}
      </ul>
    </Example>
  );
}

function Matches() {
  const jobs = [
    { title: "Analytics Engineer", meta: "Remote · posted 2 days ago", verdict: "Apply", tone: "bg-success/15 text-success", score: 82 },
    { title: "Senior Data Scientist", meta: "Hybrid · posted today", verdict: "Stretch", tone: "bg-warning/15 text-warning", score: 58 },
    { title: "Cloud Platform Engineer", meta: "On-site · posted 4 days ago", verdict: "Skip", tone: "bg-destructive/15 text-destructive", score: 31 },
  ];
  return (
    <Example>
      <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_30px_-20px_rgb(122_46_85/0.35)]">
        {jobs.map((j) => (
          <li key={j.title} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold tabular-nums text-foreground">
              {j.score}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-medium text-foreground">{j.title}</span>
              <span className="truncate text-[12.5px] text-muted-foreground">{j.meta}</span>
            </span>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", j.tone)}>{j.verdict}</span>
          </li>
        ))}
      </ul>
    </Example>
  );
}

const ROWS = [
  {
    step: "When it's a yes",
    title: "Your resume, rewritten for that one job",
    body: "Work-ly picks the lines that prove what the posting asks for and rewrites them in its words. It never adds a skill, a title or a number you don't have.",
    visual: <ResumeRewrite />,
  },
  {
    step: "Then the rest of the application",
    title: "The cover letter, the note and the interview prep",
    body: "Each one written from your real experience for that job, saved with it, and yours to edit. An evening's work, done in a few minutes.",
    visual: <Kit />,
  },
  {
    step: "And next time",
    title: "It finds the jobs worth checking",
    body: "Add your resume once and Work-ly looks for postings that fit, each with the same straight answer, so you only open the ones worth your time.",
    visual: <Matches />,
  },
];

export function WhatYouGet() {
  return (
    <section id="how-it-works" aria-labelledby="what-heading" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="what-heading" className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            If it&apos;s worth applying, Work-ly writes it
          </h2>
          <p className="mt-3 text-balance text-lg text-muted-foreground">
            The verdict is free. The application is what Pro is for.
          </p>
        </div>
        <div className="mt-14 flex flex-col gap-16 sm:gap-20">
          {ROWS.map((row, i) => (
            <div key={row.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <div className={cn("flex flex-col gap-3", i % 2 === 1 && "md:order-2")}>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">{row.step}</p>
                <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground">{row.title}</h3>
                <p className="text-pretty text-[16px] leading-relaxed text-muted-foreground">{row.body}</p>
              </div>
              <div className={cn(i % 2 === 1 && "md:order-1")}>{row.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
