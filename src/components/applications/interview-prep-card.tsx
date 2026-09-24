import Link from "next/link";
import { Sparkles, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { ProPreview, ToolBrand } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";

interface InterviewPrepCardProps {
  applicationId: string;
}

export function InterviewPrepCard({
  applicationId,
  isPro = false,
  preview,
}: InterviewPrepCardProps & { isPro?: boolean; preview?: PreviewData }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Mic className="size-5 text-primary" />
          Mock interview
          <ToolBrand>Interview War Room</ToolBrand>
        </CardTitle>
        <CardDescription>
          An AI hiring manager asks the questions this role is likely to get, listens to your spoken answers, scores them and tells you what to fix.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPro ? (
          <ProPreview
            heading="What you'd practise"
            facts={[
              { label: "Where the questions would push (your gaps for this role)", items: preview?.gaps ?? [] },
              { label: "Skills they're likely to test", items: preview?.keywords.slice(0, 6) ?? [] },
            ]}
            outputLabel="Questions, your scored answers, and what to fix"
          >
            <UpgradeModal title="Unlock mock interviews" description="Practise this interview out loud with an AI hiring manager, and get a score and fixes for every answer.">
              <Button className="gap-2 w-full sm:w-auto">
                <Lock className="size-4" />
                Start a mock interview (Pro)
              </Button>
            </UpgradeModal>
          </ProPreview>
        ) : (
          <Link href={`/applications/${applicationId}/interview`}>
            <Button className="gap-2 w-full sm:w-auto">
              <Sparkles className="size-4" />
              Start a mock interview
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
