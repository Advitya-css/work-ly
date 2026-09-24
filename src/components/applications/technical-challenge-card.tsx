import Link from "next/link";
import { isTechnicalRole } from "@/lib/role-kind";
import { Code2, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { ProPreview, ToolBrand } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";

interface TechnicalChallengeCardProps {
  applicationId: string;
  roleTitle?: string;
}

export function TechnicalChallengeCard({
  applicationId,
  roleTitle = "",
  isPro = false,
  preview,
}: TechnicalChallengeCardProps & { isPro?: boolean; preview?: PreviewData }) {
  const isTechnical = isTechnicalRole(roleTitle);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {isTechnical ? <Code2 className="size-5" /> : <BriefcaseBusiness className="size-5" />}
          {isTechnical ? "Practice coding challenge" : "Practice work scenario"}
          <ToolBrand>{isTechnical ? "Technical Sandbox" : "Scenario Sandbox"}</ToolBrand>
        </CardTitle>
        <CardDescription>
          {isTechnical 
            ? "Generate a realistic, domain-specific coding challenge based on this company's exact tech stack. Get an AI code review on your solution."
            : "Generate a realistic on-the-job scenario based on this exact role. Practice how you would handle it and get graded by the AI."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPro ? (
          <ProPreview
            heading="What you'd practise"
            facts={[{ label: isTechnical ? "The challenge would be built around" : "The scenario would draw on", items: preview?.keywords.slice(0, 5) ?? [] }]}
            outputLabel={isTechnical ? "Your challenge, then a code review of your solution" : "Your scenario, then feedback on how you handled it"}
            lines={3}
          >
            <UpgradeModal
              title={isTechnical ? "Unlock practice coding challenges" : "Unlock practice work scenarios"}
              description="Rehearse the kind of task this role will set, then get honest feedback on your answer."
            >
              <Button variant="outline" className="gap-2 w-full sm:w-auto text-primary border-primary hover:bg-primary/10">
                <Lock className="size-4" />
                Try a practice task (Pro)
              </Button>
            </UpgradeModal>
          </ProPreview>
        ) : (
          <Link href={`/applications/${applicationId}/challenge`}>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              Try a practice task
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
