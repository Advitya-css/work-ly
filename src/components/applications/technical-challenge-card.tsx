import Link from "next/link";
import { Code2, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";

interface TechnicalChallengeCardProps {
  applicationId: string;
  roleTitle?: string;
}

export function TechnicalChallengeCard({ applicationId, roleTitle = "", isPro = false }: TechnicalChallengeCardProps & { isPro?: boolean }) {
  const isTechnical = /engineer|developer|software|data|programmer|frontend|backend|fullstack|tech|it|cloud|security/i.test(roleTitle);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isTechnical ? <Code2 className="size-5" /> : <BriefcaseBusiness className="size-5" />}
          {isTechnical ? "Technical Sandbox" : "Scenario Sandbox"}
        </CardTitle>
        <CardDescription>
          {isTechnical 
            ? "Generate a realistic, domain-specific coding challenge based on this company's exact tech stack. Get an AI code review on your solution."
            : "Generate a realistic on-the-job scenario based on this exact role. Practice how you would handle it and get graded by the AI."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPro ? (
          <UpgradeModal title={isTechnical ? "Unlock Technical Sandbox" : "Unlock Scenario Sandbox"} description="Practice with AI-generated challenges based on the real tech stack of this job.">
            <Button variant="outline" className="gap-2 w-full sm:w-auto text-primary border-primary hover:bg-primary/10">
              <Lock className="size-4" />
              Open Sandbox (Pro)
            </Button>
          </UpgradeModal>
        ) : (
          <Link href={`/applications/${applicationId}/challenge`}>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              Open Sandbox
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
