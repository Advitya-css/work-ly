const fs = require('fs');

const newGuideCode = `import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Target, Compass, 
  ScanSearch, Sparkles, BriefcaseBusiness,
  Upload, MapPin, Plus, DollarSign,
  MonitorSmartphone, CheckCircle2
} from "lucide-react";

export const metadata: Metadata = { title: "How to Use Workly" };

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <PageHeader
        title="Welcome to Workly"
        description="The ultimate playbook for landing your next role. Follow these steps to set up your engine."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Step 1 */}
        <Card className="flex flex-col border-primary/20">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <FileText className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">1. Build Your Profile</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Workly's AI needs to know your background to score jobs accurately.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><Upload className="size-4 shrink-0 mt-0.5 text-primary" /> Upload your latest CV.</li>
              <li className="flex gap-3"><MapPin className="size-4 shrink-0 mt-0.5 text-primary" /> Set your home location.</li>
              <li className="flex gap-3"><Plus className="size-4 shrink-0 mt-0.5 text-primary" /> Add any missing skills manually.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
              <Target className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">2. Set Your Goals</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Tell the Priority Engine exactly what makes a job "good" for you.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><Target className="size-4 shrink-0 mt-0.5 text-orange-500" /> Enter exact target job titles.</li>
              <li className="flex gap-3"><DollarSign className="size-4 shrink-0 mt-0.5 text-orange-500" /> Set your minimum acceptable salary.</li>
              <li className="flex gap-3"><MonitorSmartphone className="size-4 shrink-0 mt-0.5 text-orange-500" /> Choose Remote, Hybrid, or Onsite.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
              <Compass className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">3. Discover Opportunities</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Stop scrolling endlessly. Let Workly pull live jobs for you.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><Compass className="size-4 shrink-0 mt-0.5 text-blue-500" /> Run automated discovery.</li>
              <li className="flex gap-3"><ScanSearch className="size-4 shrink-0 mt-0.5 text-blue-500" /> Review "Top Matches" vs "Stretch".</li>
              <li className="flex gap-3"><CheckCircle2 className="size-4 shrink-0 mt-0.5 text-blue-500" /> Click a job to see why it was picked.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
              <ScanSearch className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">4. Analyze Any Job</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Found a job on LinkedIn? Bring it straight into Workly.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><FileText className="size-4 shrink-0 mt-0.5 text-purple-500" /> Paste the job description.</li>
              <li className="flex gap-3"><ScanSearch className="size-4 shrink-0 mt-0.5 text-purple-500" /> Get a 0-100 Candidate Fit score.</li>
              <li className="flex gap-3"><Target className="size-4 shrink-0 mt-0.5 text-purple-500" /> Get a Priority Score based on goals.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 5 */}
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Sparkles className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">5. Close Skill Gaps</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Prepare for the jobs you want tomorrow with the Dream Pathway.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><Sparkles className="size-4 shrink-0 mt-0.5 text-emerald-500" /> Paste a stretch "Dream Job".</li>
              <li className="flex gap-3"><ScanSearch className="size-4 shrink-0 mt-0.5 text-emerald-500" /> Identify missing skills.</li>
              <li className="flex gap-3"><Target className="size-4 shrink-0 mt-0.5 text-emerald-500" /> Follow the 90-day project plan.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 6 */}
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4 flex-grow">
            <div className="size-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-2">
              <BriefcaseBusiness className="size-6" />
            </div>
            <h3 className="text-xl font-semibold">6. Track Applications</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Manage your entire pipeline in one Kanban board without spreadsheets.
            </p>
            <ul className="text-sm space-y-3 mt-2">
              <li className="flex gap-3"><FileText className="size-4 shrink-0 mt-0.5 text-pink-500" /> Mark opportunities as Applied.</li>
              <li className="flex gap-3"><BriefcaseBusiness className="size-4 shrink-0 mt-0.5 text-pink-500" /> Drag and drop through interview stages.</li>
              <li className="flex gap-3"><CheckCircle2 className="size-4 shrink-0 mt-0.5 text-pink-500" /> Status automatically updates profile.</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/(app)/guide/page.tsx', newGuideCode);
