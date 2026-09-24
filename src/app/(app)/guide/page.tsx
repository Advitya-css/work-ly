import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronDown, GraduationCap, Settings as SettingsIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconGuide, IconProfile, IconOpportunity, IconApplication, IconPathway } from "@/components/icons";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsByUserId } from "@/lib/db/applications";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { APPLICATION_TOOL_IDS, TOOLS, applicationToolHref, type Tool, type ToolId } from "@/lib/guidance/tools";
import type { Application, ApplicationStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Guide" };

const PLACE_LABEL: Record<Tool["place"], string> = {
  career: "My career",
  jobs: "Jobs",
  opportunity: "A job's analysis page",
  application: "An application",
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
 * interview, their own offer - when there is one. The screen-by-screen
 * reference is still here, folded away at the bottom.
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
      body: "Check whether it's worth your time, then send an application written for it.",
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
  ];

  const allTools = Object.values(TOOLS);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 pb-24">
      <PageHeader
        title="Guide"
        description="Pick where you are. Each one shows the tools that help and takes you straight there."
        icon={IconGuide}
        area="career"
        action={<ReplayTourButton />}
      />

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
                        {tool.pro ? (tool.freeNote ?? "Pro") : "Free"}
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

      <section aria-labelledby="tools-title" className="flex flex-col gap-4">
        <div>
          <h2 id="tools-title" className="text-lg font-semibold text-foreground">
            Every tool at a glance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Where each one lives and when it appears. Tools on an application open up as it moves through the stages.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_5.5rem] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Tool</span>
            <span>What it does</span>
            <span>Where</span>
            <span>When</span>
            <span>Plan</span>
          </div>
          <ul className="divide-y divide-border">
            {allTools.map((tool) => (
              <li
                key={tool.id}
                className="grid grid-cols-1 gap-1 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_5.5rem] md:gap-4"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{tool.name}</span>
                  {tool.brand && <span className="text-xs text-muted-foreground">{tool.brand}</span>}
                </span>
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
      </section>

      <details className="group rounded-xl border border-border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Every screen, button by button
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-border px-4 pt-5 pb-5 sm:px-5">
          <div>
            <Tabs defaultValue="career" className="gap-6">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="career">My Career</TabsTrigger>
                <TabsTrigger value="jobs">Discover &amp; Jobs</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="path">Career Path</TabsTrigger>
                <TabsTrigger value="student">Student Mode</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="career" className="flex flex-col gap-4">
                <Card area="career">
                  <CardHeader>
                    <CardTitle>
                      <IconProfile className="size-5 text-[var(--area-color)]" />
                      Career Profile
                    </CardTitle>
                    <CardDescription>
                      The single source of truth Work-ly checks everything else against.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Resume</span> — drag a PDF or DOCX
                      (up to 10MB) onto the card, or browse for one. Work-ly reads it and drafts your
                      profile automatically; each upload shows as Parsing, Parsed, or Failed to parse,
                      and can be removed. If it finds a location in the file, it asks once whether to
                      save it to your profile.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Facts about you</span> — headline,
                      location, current role and company, years of experience, and a short summary.
                      <span className="font-medium text-foreground"> Save profile</span> commits changes.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Experience, Education, Projects, Skills, Certifications, and Achievements
                      </span>{" "}
                      each work the same way: an <span className="font-medium text-foreground">Add</span> button
                      opens a form, and every existing entry has a pencil to edit and a trash icon to
                      delete (with a confirmation step first). Entries the AI is unsure about carry a
                      small <span className="font-medium text-foreground">Confirm</span> button and an
                      “Unconfirmed” badge until you clear it. Every entry is also labelled with where it
                      came from — from your CV, added by you, or AI inferred — so nothing is silently
                      invented.
                    </p>
                    <p>
                      The Skills section will sometimes suggest a transferable skill it noticed in your
                      experience; <span className="font-medium text-foreground">Yes, that&apos;s me</span> accepts
                      it, <span className="font-medium text-foreground">Dismiss</span> discards it.
                      <span className="font-medium text-foreground"> Work Values</span> is read-only — it
                      shows values the AI inferred from your CV with a confidence score and the sentence
                      that suggested it; there is nothing to add, only to re-parse by uploading a newer
                      resume.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Share Profile</span>, at the top of
                      the page, generates a public read-only link to your profile — the same button
                      becomes <span className="font-medium text-foreground">Copy Public Link</span> once
                      it&apos;s on, and <span className="font-medium text-foreground">Make Private</span> turns
                      it back off.
                    </p>
                  </CardContent>
                </Card>

                <Card area="career" variant="flat" className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Goals and Dream Job</CardTitle>
                    <CardDescription>Reached from the tabs at the top of My Career.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Career Goals</span> — a running list
                      of what you&apos;re working toward, each with a status (active, achieved, paused,
                      archived) and its own edit and delete controls.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Dream Job</span> — paste a posting
                      for a role you actually want and Work-ly scores how close you already are (Pro for
                      unlimited use; your first one is free), then lays out what you already have, the
                      biggest gaps, and a concrete next step. Every past analysis is saved and stays one
                      click away.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="jobs" className="flex flex-col gap-4">
                <Card area="discover">
                  <CardHeader>
                    <CardTitle>Discover</CardTitle>
                    <CardDescription>Curated from across the web, scored against your profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      Four search modes sit above the results: <span className="font-medium text-foreground">Standard
                      Search</span> (keyword and seniority), <span className="font-medium text-foreground">Brainstorm
                      / Explore</span> (describe an interest, not a title), <span className="font-medium text-foreground">Target
                      Company</span> (a specific employer), and <span className="font-medium text-foreground">Search
                      by Major</span> (built for students). Each changes the search field&apos;s
                      placeholder and the button&apos;s label, but they all feed the same results below.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Match my Values</span> cross-checks
                      results against the values inferred from your profile and gives aligned jobs a
                      fit boost. The <span className="font-medium text-foreground">+</span> button beside
                      the search bar adds a public RSS feed as your own custom source.
                    </p>
                    <p>
                      Results can be filtered to a priority band — Apply Now, Strong, Stretch, or Low
                      Priority — and sorted by Top Matches, Candidate Fit, or Recently Found. On each
                      card, <span className="font-medium text-foreground">Analyze &amp; track</span> pulls
                      it into your pipeline, and <span className="font-medium text-foreground">Not
                      relevant</span> dismisses it; <span className="font-medium text-foreground">View
                      original</span> always links back to the real source.
                    </p>
                  </CardContent>
                </Card>

                <Card area="opportunity">
                  <CardHeader>
                    <CardTitle>
                      <IconOpportunity className="size-5 text-[var(--area-color)]" />
                      Jobs (Opportunities)
                    </CardTitle>
                    <CardDescription>Everything you&apos;ve analyzed, ordered by what&apos;s worth your time.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      Filter tabs across the top (All, Apply Now, High Priority, Stretch, Saved,
                      Analyzed, Applied) narrow the list at a glance; the{" "}
                      <span className="font-medium text-foreground">Filters</span> button opens a fuller
                      panel — role, location, industry, country, seniority, work mode, employment type,
                      and minimum salary, fit, or priority. Sort by priority, fit, deadline, date found,
                      or salary.
                    </p>
                    <p>
                      The bookmark icon on a card saves it for later; the priority bar and fit score
                      are always visible without opening it. <span className="font-medium text-foreground">View
                      analysis</span> opens the full breakdown, where you can mark a role as preparing or
                      applied, or reset it back to just discovered.
                    </p>
                    <p>
                      Once you&apos;ve opened a specific job, the{" "}
                      <span className="font-medium text-foreground">Tools for this job</span> card under its scores
                      offers a resume tailored to it, a cover letter, a message to the hiring manager, and the
                      interview questions it&apos;s likely to ask you (all Pro).
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="applications" className="flex flex-col gap-4">
                <Card area="application">
                  <CardHeader>
                    <CardTitle>
                      <IconApplication className="size-5 text-[var(--area-color)]" />
                      Applications
                    </CardTitle>
                    <CardDescription>What you&apos;ve applied to, what happened, and what that tells you.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Log an application</span> adds one by
                      hand (role, company, industry, location, and starting stage) — most of the time
                      you&apos;ll arrive here instead by tracking a job from Discover or Jobs. Switch
                      between <span className="font-medium text-foreground">Pipeline</span> (a Kanban
                      board you drag cards across) and <span className="font-medium text-foreground">Table</span> view,
                      or move a card&apos;s stage from its own dropdown if dragging isn&apos;t convenient.
                    </p>
                    <p>
                      Opening an application lets you fill in the CV version you sent, the date applied,
                      salary offered, your cover letter, and private notes, plus add interviews and
                      contacts as they happen.
                    </p>
                    <p className="font-medium text-foreground">The tools that open up as the application moves forward:</p>
                    <ul className="ml-4 list-disc space-y-1.5 marker:text-[var(--area-color)]">
                      {APPLICATION_TOOL_IDS.map((id) => (
                        <li key={id}>
                          <span className="font-medium text-foreground">{TOOLS[id].name}</span>
                          {TOOLS[id].brand ? ` (${TOOLS[id].brand})` : ""} - {whenLabel(TOOLS[id]).toLowerCase()}
                          {TOOLS[id].pro ? ", Pro" : ", free"}. {TOOLS[id].blurb}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="path" className="flex flex-col gap-4">
                <Card area="pathway">
                  <CardHeader>
                    <CardTitle>
                      <IconPathway className="size-5 text-[var(--area-color)]" />
                      Career Path
                    </CardTitle>
                    <CardDescription>A practical, ordered pathway from where you are to where you want to be.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      This starts from a Dream Job analysis. Once you have one,{" "}
                      <span className="font-medium text-foreground">Build My Dream Pathway</span> (Pro)
                      turns its gaps into an ordered set of steps and a 30/60/90-day action plan; you can
                      regenerate it later without losing the old one, which is archived rather than
                      deleted.
                    </p>
                    <p>
                      Every step and action can be marked <span className="font-medium text-foreground">Complete</span>,{" "}
                      <span className="font-medium text-foreground">Skip</span>, or{" "}
                      <span className="font-medium text-foreground">Reopen</span>ed if you change your
                      mind, and each has its own <span className="font-medium text-foreground">Edit</span> and{" "}
                      <span className="font-medium text-foreground">Add note</span> for anything private
                      you want to remember about it. A step that unlocks new roles links straight to
                      Jobs or a pre-filled Discover search.
                    </p>
                    <p>
                      A weekly check-in banner asks whether you&apos;re making progress or need to
                      adjust. Further down, <span className="font-medium text-foreground">What-if
                      simulation</span> lets you test a hypothetical change — a new skill, a different
                      target — without touching your real profile; results are always labelled as a
                      simulation and never saved automatically.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="student" className="flex flex-col gap-4">
                <Card className="border-t-4 border-t-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="size-5 text-purple-500" />
                      Student Mode
                    </CardTitle>
                    <CardDescription>Tailored tools for campus jobs, internships, and university requirements.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      Work-ly adapts completely when you turn on <span className="font-medium text-foreground">Student Mode</span> from Settings. It changes the scoring engine to focus on coursework and side projects rather than years of enterprise experience.
                    </p>
                    <p>
                      You get a dedicated <span className="font-medium text-foreground">Student Home</span> tab to manage on-campus jobs, off-campus roles, and internships.
                    </p>
                    <ul className="ml-4 list-disc space-y-1.5 marker:text-purple-500">
                      <li><span className="font-medium text-foreground">University Feeds</span> — Add your university's public job board feed directly into Work-ly, and it will scrape campus jobs into your Discovery queue.</li>
                      <li><span className="font-medium text-foreground">Legal Limits Tracking</span> — Input your student country, and Work-ly automatically warns you if an off-campus job exceeds your visa's permitted working hours.</li>
                      <li><span className="font-medium text-foreground">Auto-Classification</span> — The AI instantly categorizes new roles into On-Campus, Off-Campus, and Internships.</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------------- */}
              <TabsContent value="settings" className="flex flex-col gap-4">
                <Card className="border-t-4 border-t-slate-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SettingsIcon className="size-5 text-slate-500" />
                      Settings & Preferences
                    </CardTitle>
                    <CardDescription>Control how Work-ly's discovery and scoring engines behave.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
                    <p>
                      Settings is where you steer the underlying AI models by setting your <span className="font-medium text-foreground">Locations</span>, and configuring the engine for specific working styles.
                    </p>
                    <ul className="ml-4 list-disc space-y-1.5 marker:text-slate-500">
                      <li><span className="font-medium text-foreground">Part-Time & Shift Work</span> — Optimize the discovery engine for hourly work, shift availability, and retail/service sector parsing.</li>
                      <li><span className="font-medium text-foreground">Freelance & Gig Economy</span> — Tailor Work-ly for contractors and freelancers, focusing the AI on finding contract roles and parsing portfolios over traditional CVs.</li>
                      <li><span className="font-medium text-foreground">Student Mode Toggle</span> — Instantly swap the app between full-time career tracking and student-focused discovery.</li>
                      <li><span className="font-medium text-foreground">Privacy Controls</span> — Manage your data, export your profile, or completely delete your account. Work-ly keeps you in control.</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </details>
    </div>
  );
}
