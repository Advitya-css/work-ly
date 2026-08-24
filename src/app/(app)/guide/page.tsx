import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Target, 
  Compass, 
  ScanSearch, 
  Sparkles,
  BriefcaseBusiness,
  MapPin,
  LineChart
} from "lucide-react";

export const metadata: Metadata = { title: "How to use Workly" };

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-12">
      <PageHeader
        title="The Workly Playbook"
        description="A complete guide to using Workly to its fullest potential. Learn how to set up your profile, automate your job search, and close your skill gaps."
      />

      <div className="flex flex-col gap-8 mt-4">
        {/* Step 1: Profile */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="size-6" />
            <h2 className="text-2xl font-semibold">1. Build Your Foundation (Profile & Location)</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Workly's algorithms need to know who you are before they can score jobs for you. The more detail you provide, the more accurate your Fit Scores will be.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Upload your Resume:</strong> Go to <strong>My career &gt; Profile</strong> and upload your latest CV. Workly will automatically extract your skills, education, and years of experience.</li>
                <li><strong className="text-foreground">Set your Home Location:</strong> In your Profile settings, make sure to set where you currently live. The engine uses this to check if a job's location is feasible for you.</li>
                <li><strong className="text-foreground">Add Missing Skills:</strong> If the parser missed anything, manually add skills and tie them to specific projects or experiences to increase your "Evidence Strength".</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step 2: Goals */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Target className="size-6" />
            <h2 className="text-2xl font-semibold">2. Set Your Career Goals (Preferences & Salary)</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                While the Fit Score measures if you are good for the job, the <strong>Priority Engine</strong> measures if the job is good for <em>you</em>. It needs to know your targets to do this.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Create a Goal:</strong> Navigate to <strong>My career &gt; Goals</strong> and click "Add a career goal".</li>
                <li><strong className="text-foreground">Target Role & Salary:</strong> Enter the exact job titles you want (e.g., "Product Analytics Intern") and your minimum acceptable salary. Jobs paying below this floor will be flagged as Low Priority.</li>
                <li><strong className="text-foreground">Location & Work Mode:</strong> Specify if you want Remote, Hybrid, or Onsite roles, and list the specific cities/countries you'd be willing to work in. Workly strictly enforces these rules when recommending jobs.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step 3: Discovery */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Compass className="size-6" />
            <h2 className="text-2xl font-semibold">3. Find Jobs Automatically (Discovery)</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Instead of scrolling endlessly on job boards, Workly pulls in live postings and does the reading for you.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Run Discovery:</strong> Go to <strong>Jobs &gt; Discover</strong>. Workly aggregates jobs from various sources based on your profile and goals.</li>
                <li><strong className="text-foreground">The Buckets:</strong> Workly sorts everything it finds into actionable buckets: <em>Top Matches</em> (apply immediately), <em>Stretch Roles</em> (you meet some criteria but not all), and <em>Low Priority</em> (wrong location, bad pay, or no fit).</li>
                <li><strong className="text-foreground">No More Guessing:</strong> Click on any discovered job to see exactly <em>why</em> it was placed in that bucket, with a line-by-line breakdown of requirements.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step 4: Analyze */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <ScanSearch className="size-6" />
            <h2 className="text-2xl font-semibold">4. Analyze Specific Jobs Manually</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                If you find a job on LinkedIn, YC, or a company website, you can bring it directly into Workly.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Paste the Text:</strong> Go to <strong>Jobs &gt; Analyze a job</strong>. Paste the job title, company, and description.</li>
                <li><strong className="text-foreground">Candidate Fit vs Priority:</strong> The analysis gives you two distinct scores. <strong>Candidate Fit</strong> (out of 100) tells you how well your resume matches the job's requirements. <strong>Priority</strong> tells you if the job aligns with your personal goals (salary, commute, career progression).</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step 5: Dream Job */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-6" />
            <h2 className="text-2xl font-semibold">5. Close the Gap (Dream Job & Career Path)</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Workly isn't just about applying to jobs you can get today; it's about preparing you for the jobs you want tomorrow.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Dream Job Analysis:</strong> Go to <strong>My career &gt; Dream job</strong> and paste a stretch role you eventually want (e.g., "Senior Data Scientist"). Workly will identify the exact skills and experience gaps holding you back.</li>
                <li><strong className="text-foreground">Career Path:</strong> Navigate to <strong>My career &gt; Career path</strong>. Workly uses your Dream Job gaps to generate a step-by-step 90-day learning plan, complete with project ideas to build the evidence you're missing.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step 6: Tracking */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <BriefcaseBusiness className="size-6" />
            <h2 className="text-2xl font-semibold">6. Track Your Pipeline</h2>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Keep your job hunt organized without maintaining messy spreadsheets.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-foreground">Mark as Preparing/Applied:</strong> When viewing a job analysis, use the top buttons to move it into your pipeline.</li>
                <li><strong className="text-foreground">Applications Board:</strong> Go to <strong>Applications</strong> to see a Kanban-style view of all your saved jobs, active applications, interviews, and offers.</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
