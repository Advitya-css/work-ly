import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { IconGuide } from "@/components/icons";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";
import { BUSINESS } from "@/lib/business";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsByUserId } from "@/lib/db/applications";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { TOOLS, applicationToolHref, type Tool, type ToolId } from "@/lib/guidance/tools";
import type { Application, ApplicationStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Guide" };

const PLACE_LABEL: Record<Tool["place"], string> = {
  career: "My career",
  jobs: "Jobs",
  opportunity: "A job's application kit",
  application: "An application",
  insights: "Insights (under My career)",
};

function whenLabel(tool: Tool): string {
  switch (tool.unlocksAt) {
    case "APPLIED":
      return "After a week with no reply";
    case "ASSESSMENT":
      return "From the assessment stage";
    case "INTERVIEW":
      return "From the interview stage";
    case "OFFER":
      return "When you have an offer";
    default:
      return "Any time";
  }
}

function planLabel(tool: Tool): string {
  if (tool.yearly) return "Yearly Pass";
  if (!tool.pro) return "Free";
  return tool.freeNote ? `Pro · ${tool.freeNote.toLowerCase()}` : "Pro";
}

interface Situation {
  key: string;
  title: string;
  body: string;
  tools: ToolId[];
  cta: { label: string; href: string };
}

function latest(apps: Application[], ...statuses: ApplicationStatus[]): Application | null {
  return (
    apps
      .filter((a) => statuses.includes(a.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null
  );
}

function named(app: Application): string {
  return app.company ?? app.roleTitle;
}

/**
 * The Guide, organised by the situation someone is in rather than by
 * screen. People open a guide with a question ("I've got an interview on
 * Friday - what now?"), not to read a tour of the menus, so each situation
 * names the tools for it and links straight to the right place - their own
 * interview, their own offer - when there is one. Then the honest answers
 * to the questions people actually ask, and a short map of where things
 * live. (A button-by-button reference used to sit at the bottom; it had
 * drifted from the app and is gone.)
 */
export default async function GuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [applications, dreamJobs, full] = await Promise.all([
    listApplicationsByUserId(user.id),
    listDreamJobsByUserId(user.id),
    getFullCareerProfile(user.id),
  ]);
  const hasProfile = full.experiences.length > 0 || full.skills.length > 0;

  const interview = latest(applications, "FINAL_INTERVIEW", "INTERVIEW", "ASSESSMENT");
  const offer = latest(applications, "OFFER");
  const waiting = latest(applications, "APPLIED");

  const situations: Situation[] = [
    {
      key: "start",
      title: "I'm just getting started",
      body: "Upload your resume once. Work-ly builds your profile from it and scores every job against it.",
      tools: ["discover"],
      cta: hasProfile
        ? { label: "Find my matches", href: "/discover" }
        : { label: "Upload my resume", href: "/career-profile" },
    },
    {
      key: "found",
      title: "I found a job I like",
      body: "Get a straight answer on whether it's worth your time. If it is, open its application kit and have it written.",
      tools: ["analyze-job", "tailored-resume", "cover-letter", "hiring-manager"],
      cta: { label: "Check a job", href: "/analyze-job" },
    },
    {
      key: "waiting",
      title: "I've applied and I'm waiting",
      body: "Log it so nothing slips, nudge the hiring manager, and start preparing before anyone calls.",
      tools: ["follow-up", "interview-questions"],
      cta: waiting
        ? { label: `Open your ${named(waiting)} application`, href: `/applications/${waiting.id}` }
        : { label: "Open my applications", href: "/applications" },
    },
    {
      key: "interview",
      title: "I have an interview coming up",
      body: "Rehearse out loud, know the questions they're likely to ask, and practise the kind of task they'll set.",
      tools: ["mock-interview", "interview-questions", "practice-task"],
      cta: interview
        ? { label: `Prepare for ${named(interview)}`, href: applicationToolHref(interview.id, interview.status === "ASSESSMENT" ? "practice-task" : "mock-interview") }
        : { label: "Move an application to Interview", href: "/applications" },
    },
    {
      key: "offer",
      title: "I got an offer",
      body: "Negotiate before you say yes, then move your profile to the new job in one click.",
      tools: ["counter-offer", "accept-offer"],
      cta: offer
        ? { label: `Open your ${named(offer)} offer`, href: applicationToolHref(offer.id, "counter-offer") }
        : { label: "Open my applications", href: "/applications" },
    },
    {
      key: "switch",
      title: "I want to change careers or aim higher",
      body: "See exactly how far you are from the role you want, then follow a plan that closes the gap.",
      tools: ["dream-job", "pathway"],
      cta: dreamJobs.length > 0
        ? { label: "Open my pathway", href: "/career-path" }
        : { label: "Check my dream job", href: "/dream-job" },
    },
    {
      key: "landed",
      title: "I've landed a job (or I'm happy where I am)",
      body: "Stay ready without the effort: know your worth, keep growing toward the next role, and hear about the rare job worth moving for.",
      tools: ["market-value", "progress-tracker", "job-watch"],
      cta: { label: "Open Insights", href: "/insights" },
    },
  ];

  const allTools = Object.values(TOOLS);

  const LOOP = [
    { title: "Add your resume", body: "Once. Everything Work-ly checks and writes comes from it." },
    { title: "Check a job", body: "Paste one, or let Work-ly find some. You get apply, stretch or skip, with proof." },
    { title: "Get it written", body: "For the jobs worth it: resume, cover letter, a note to the hiring manager, interview prep." },
  ];

  const FAQ: { q: string; a: string }[] = [
    {
      q: "Does Work-ly ever make things up?",
      a: "No. A requirement only counts as met when Work-ly can quote the line on your resume that proves it. Everything it writes is built from your profile, and any new wording or number it can't trace back to you is flagged for you to check before you send it.",
    },
    {
      q: "Why did it tell me to skip a job?",
      a: "Because the posting asks for things your resume doesn't show yet, usually a must-have. Better to know before you spend an evening on it. Each gap comes with what would close it. If you do have that experience, add it to your profile and re-check the job.",
    },
    {
      q: "How is the score worked out?",
      a: "Each requirement in the posting is checked against your profile: shown, partly shown or not shown, with must-haves counting more. Open any job and press \u201cHow the score is worked out\u201d to see every part of it.",
    },
    {
      q: "Can I change what it writes?",
      a: "Yes, all of it. Click any text in your resume, letter or note and type; your edits save on their own. Download as PDF or Word when you're happy.",
    },
    {
      q: "What's free and what's Pro?",
      a: "Free: checking jobs (up to 15 AI checks a day), finding matches, tracking applications, one dream-job analysis, and follow-up and counter-offer emails. Pro adds the application kit for every job (resume, cover letter, hiring-manager note, interview prep), mock interviews, practice tasks and the LinkedIn makeover.",
    },
    {
      q: "How do I change the role it searches for?",
      a: "On Discover, press Change next to \u201cSearching for\u2026\u201d. Or set your target role under My career, then Goals.",
    },
    {
      q: "Is my data private?",
      a: "Work-ly runs on Google Gemini's paid API, which doesn't train on what you send. You can export or delete everything any time from Settings.",
    },
  ];

  const MAP: { place: string; href: string; what: string; inside?: string }[] = [
    { place: "Home", href: "/dashboard", what: "Your next move, your best matches and where your applications stand." },
    { place: "Jobs", href: "/opportunities", what: "Every job you're looking at.", inside: "Opportunities, Discover, Analyze a job" },
    { place: "My career", href: "/career-profile", what: "Your resume, your goals and where you're heading.", inside: "Profile, Goals, LinkedIn, Dream job, Action plan, Career change, Insights" },
    { place: "Applications", href: "/applications", what: "What you've sent, by stage, with the right help at each stage." },
    { place: "Settings", href: "/settings", what: "Your plan, locations, student or freelance mode, and privacy." },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 pb-24">
      <PageHeader
        title="Guide"
        description="Pick where you are. Each one shows the tools that help and takes you straight there."
        icon={IconGuide}
        area="career"
        action={<ReplayTourButton />}
      />

      {/* The whole idea, in three steps, with the robot. */}
      <section aria-labelledby="loop-title" className="feature-panel flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex items-center gap-4">
          <Image src="/workly-bot-face.png" alt="" width={56} height={56} className="size-14 shrink-0 object-contain" />
          <div className="flex flex-col gap-0.5">
            <h2 id="loop-title" className="text-lg font-semibold text-foreground">
              How Work-ly works
            </h2>
            <p className="text-sm text-muted-foreground">Three steps. Everything else in the app is one of these, in more detail.</p>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {LOOP.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{step.title}</span>
                <span className="text-[13px] leading-snug text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="situations-title" className="flex flex-col gap-4">
        <h2 id="situations-title" className="text-lg font-semibold text-foreground">
          What do you need right now?
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {situations.map((s) => (
            <li key={s.key} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold leading-snug text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 border-t border-border pt-3">
                {s.tools.map((id) => {
                  const tool = TOOLS[id];
                  return (
                    <li key={id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{tool.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {tool.yearly ? "Yearly" : tool.pro ? (tool.freeNote ?? "Pro") : "Free"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Button asChild variant="outline" className="h-auto min-h-10 w-full justify-between gap-2 whitespace-normal py-2 text-left">
                <Link href={s.cta.href}>
                  {s.cta.label}
                  <ArrowRight className="shrink-0" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="flex flex-col gap-4">
        <h2 id="faq-title" className="text-lg font-semibold text-foreground">
          Questions people ask
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-medium text-foreground transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="max-w-3xl px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="map-title" className="flex flex-col gap-4">
        <div>
          <h2 id="map-title" className="text-lg font-semibold text-foreground">
            Where things live
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">The sidebar has four places. Some have tabs along the top.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MAP.map((m) => (
            <li key={m.place}>
              <Link
                href={m.href}
                className="group flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
              >
                <span className="flex items-center justify-between text-[15px] font-semibold text-foreground">
                  {m.place}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="text-sm text-muted-foreground">{m.what}</span>
                {m.inside && <span className="text-xs text-muted-foreground/90">Tabs: {m.inside}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <details className="group rounded-xl border border-border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Every tool at a glance
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-border">
          <p className="px-5 pt-4 text-sm text-muted-foreground">
            Where each one lives and when it appears. Tools on an application open up as it moves through the stages.
          </p>
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {allTools.map((tool) => (
              <li
                key={tool.id}
                className="grid grid-cols-1 gap-1 px-5 py-3 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_5.5rem] md:gap-4"
              >
                <span className="font-medium text-foreground">{tool.name}</span>
                <span className="text-muted-foreground">{tool.blurb}</span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  <span className="md:hidden">Where: </span>
                  {PLACE_LABEL[tool.place]}
                </span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  <span className="md:hidden">When: </span>
                  {whenLabel(tool)}
                </span>
                <span className="text-xs font-medium text-foreground md:text-sm">{planLabel(tool)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <p className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
        <span>Still stuck? Ask Work-ly in the corner of any page, or email</span>
        <a href={`mailto:${BUSINESS.supportEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {BUSINESS.supportEmail}
        </a>
      </p>
    </div>
  );
}
