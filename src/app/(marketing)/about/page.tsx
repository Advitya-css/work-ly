import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "About",
  description:
    "Work-ly is AI career software for individuals: tailored resumes, honest fit scores, mock interviews and a plan to reach the role you want.",
};

const DOES = [
  "Turns your resume into a career profile you can check and edit",
  "Scores how well you match a role you're considering, and explains why",
  "Tailors your resume and cover letter to that role, from your real experience only",
  "Rehearses interviews with you and gives feedback on every answer",
  "Shows what separates you from the role you want, with a step-by-step plan",
  "Tracks your applications so you can see what actually works",
];

const DOES_NOT = [
  "Charge employers, recruiters or anyone else - you are the only customer",
  "Post, sell or advertise job listings, or run ads of any kind",
  "Place candidates, act as a recruiter or take a fee when you're hired",
  "Promise interviews, offers or any hiring outcome",
  "Sell your data or invent qualifications you don't have",
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">About Work-ly</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Work-ly is AI career software for individuals. You bring your resume and the roles you care about; Work-ly helps
          you understand where you stand, prepare stronger applications and interviews, and grow toward the role you want.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">What Work-ly does</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground marker:text-primary">
            {DOES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">What Work-ly doesn&apos;t do</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
            {DOES_NOT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">How we use AI</h2>
        <p className="leading-relaxed text-muted-foreground">
          Every score and suggestion is grounded in what your own profile actually says. When Work-ly says you meet a
          requirement, it can quote the line of your resume that shows it; when it rewrites a bullet, it keeps your real
          numbers and adds no experience you don&apos;t have. Scores describe how your profile matches a role&apos;s stated
          requirements - they are not a prediction of whether you&apos;ll be hired.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Where Work-ly shows public job listings to match you against, it links to the original posting and the
          employer&apos;s own site. Listings come from public sources and licensed job-data APIs; Work-ly isn&apos;t paid by
          anyone to show them.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Who runs Work-ly</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Work-ly is built and operated by {BUSINESS.operator}, a sole proprietor based in {BUSINESS.country}.
          {BUSINESS.address ? ` Business address: ${BUSINESS.address}.` : ""} Customers use it around the world.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
