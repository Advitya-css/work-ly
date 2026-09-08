import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Lock, Zap, Sparkles, GraduationCap, Settings as SettingsIcon } from "lucide-react";
import {
  IconGuide,
  IconProfile,
  IconOpportunity,
  IconApplication,
  IconPathway,
} from "@/components/icons";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";

export const metadata: Metadata = { title: "Guide" };

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-24">
      <PageHeader
        title="Guide"
        description="What each screen does, and exactly which button does it."
        icon={IconGuide}
        area="career"
        action={<ReplayTourButton />}
      />

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Free
            </CardTitle>
            <CardDescription>Everything you need to discover jobs and track your applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>The Discovery feed, including target-company and by-major search</li>
              <li>Kanban tracking for every application</li>
              <li>One free dream-job readiness analysis</li>
              <li>Student, freelance, and part-time modes</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="size-24" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Zap className="size-5" />
              Pro
            </CardTitle>
            <CardDescription>Everything the AI can do on your behalf.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <ul className="space-y-2.5 text-sm font-medium">
              <li className="flex gap-2"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Unlimited dream-job analyses and pathway generation</span></li>
              <li className="flex gap-2"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>AI resume tailoring and application strategy per job</span></li>
              <li className="flex gap-2"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Interview War Room and the technical/scenario sandbox</span></li>
              <li className="flex gap-2"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Salary negotiation and follow-up email drafting</span></li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section>
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
                  Once you&apos;ve opened a specific job, <span className="font-medium text-foreground">Tailor
                  Resume &amp; Cover Letter</span> (Pro) generates an ATS-optimized resume rewrite and a
                  cover-letter draft for that exact posting, ready to copy.
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
                <p className="font-medium text-foreground">The AI tools that appear as you progress:</p>
                <ul className="ml-4 list-disc space-y-1.5 marker:text-[var(--area-color)]">
                  <li><span className="font-medium text-foreground">AI Resume Tailor</span> (Pro) — rewrites your resume bullets and keywords against this specific job description.</li>
                  <li><span className="font-medium text-foreground">Auto-Tailor</span> — generates a cover letter and matching resume rewrites together.</li>
                  <li><span className="font-medium text-foreground">Salary Negotiator</span> — appears once an offer is logged; drafts a counter-offer email from your target number and leverage.</li>
                  <li><span className="font-medium text-foreground">Interview War Room</span> (Pro) — appears once you reach an interview; an AI interviewer that asks role-specific questions and takes spoken answers.</li>
                  <li><span className="font-medium text-foreground">Technical / Scenario Sandbox</span> (Pro, same stage) — a coding challenge or on-the-job scenario built around the company&apos;s actual stack, with AI review.</li>
                  <li><span className="font-medium text-foreground">Follow-up email</span> — offered automatically once an application has gone quiet for a week.</li>
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
      </section>
    </div>
  );
}
