import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Lock, Zap, Sparkles, Target, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "Platform Guide & Features" };

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-12 max-w-5xl mx-auto pb-24">
      <PageHeader
        title="Welcome to Workly"
        description="Your AI-powered career intelligence platform. Here is everything you need to know to land your dream job."
      />

      <section className="grid gap-8 md:grid-cols-2">
        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              Free Tier (The Core Engine)
            </CardTitle>
            <CardDescription>Everything you need to discover jobs and track your applications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3"><Compass className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span><strong>The Discovery Feed:</strong> Access global job boards and unlisted ATS jobs.</span></li>
              <li className="flex gap-3"><Target className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span><strong>Target Company Search:</strong> Scrape specific companies for open roles.</span></li>
              <li className="flex gap-3"><CheckCircle2 className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span><strong>Kanban Tracking:</strong> Bookmark and track all your applications.</span></li>
              <li className="flex gap-3"><CheckCircle2 className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span><strong>1 Free Gap Analysis:</strong> Test the AI to see your readiness score for a dream job.</span></li>
              <li className="flex gap-3"><CheckCircle2 className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span><strong>Specialized Modes:</strong> Toggle Student, Freelance, or Part-Time discovery.</span></li>
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
              Workly Pro
            </CardTitle>
            <CardDescription>The ultimate unfair advantage. Automate your job hunt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex gap-3"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Unlimited AI Dream Job Analyses & Scoring</span></li>
              <li className="flex gap-3"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>AI Resume Tailoring (Bypass ATS filters instantly)</span></li>
              <li className="flex gap-3"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>The Dream Pathway (30-day personalized coaching plans)</span></li>
              <li className="flex gap-3"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Application Strategy (AI Cover Letters & Cold Emails)</span></li>
              <li className="flex gap-3"><Lock className="size-4 text-primary shrink-0 mt-0.5" /><span>Interview Simulator & Technical Sandbox</span></li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">How to use Workly</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Build your Profile</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Head over to your profile and upload your current Resume/CV as a PDF. Our engine will instantly extract your skills, education, and experience timeline.
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Discover Jobs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Go to the Discover tab. Workly aggressively filters out irrelevant industries and only shows you jobs that actually match your background. 
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Analyze & Tailor (Pro)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Found a job you love? Run a Dream Job analysis to see your gaps. Then, use the AI Resume Tailor to rewrite your resume specifically for that role in seconds.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
