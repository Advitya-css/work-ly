import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

export interface TransitionRoadmapData {
  hasResume: boolean;
  hasFoundationProfile: boolean;
  trackedCount: number;
  appliedCount: number;
}

const TARGET_LIST_SIZE = 10;
const PIPELINE_APPLICATIONS = 3;

/**
 * Derives the three roadmap steps from real profile/application data
 * instead of a hardcoded { done: true/false } list. Kept as a plain
 * function (not inline in the component) so it's easy to see, and change,
 * what "done" means for each step without touching the rendering.
 */
function buildSteps(data: TransitionRoadmapData) {
  const foundationDone = data.hasResume && data.hasFoundationProfile;
  const networkDone = data.trackedCount >= TARGET_LIST_SIZE;
  const pipelineDone = data.appliedCount >= PIPELINE_APPLICATIONS;

  return [
    {
      title: "Foundation: Resume & Profile",
      desc: foundationDone
        ? "Your resume is uploaded and your profile has a headline and summary. This step is done."
        : !data.hasResume
          ? "Upload your resume and fill in your headline and summary so Work-ly (and anyone reviewing your profile) has something to work from."
          : "Add a headline and summary to your career profile - your resume is uploaded, but a profile without one reads as unfinished.",
      done: foundationDone,
    },
    {
      title: "Network: Build a Target List",
      desc: `You've tracked ${data.trackedCount} of ${TARGET_LIST_SIZE} target opportunities. ${
        networkDone
          ? "That's a real pipeline - keep it fresh as roles close or you rule them out."
          : "Track roles from Discover or your own research as you find them; a shortlist under 10 is too thin to run a real search on."
      }`,
      done: networkDone,
    },
    {
      title: "Pipeline: Submit Applications",
      desc: `${data.appliedCount} application${data.appliedCount === 1 ? "" : "s"} submitted so far${
        pipelineDone
          ? ". You're actively in the market - keep the pace up."
          : `. Aim for at least ${PIPELINE_APPLICATIONS} in flight so one rejection isn't your whole pipeline.`
      }`,
      done: pipelineDone,
    },
  ];
}

export function TransitionRoadmap({ data }: { data: TransitionRoadmapData }) {
  const steps = buildSteps(data);
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Transition Roadmap</CardTitle>
        <CardDescription>
          {completedCount} of {steps.length} steps done, based on your actual profile and tracked
          applications - not a generic checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            {step.done ? (
              <CheckCircle2 className="size-5 text-primary shrink-0" />
            ) : (
              <Circle className="size-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{step.title}</span>
              <span className="text-xs text-muted-foreground">{step.desc}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
