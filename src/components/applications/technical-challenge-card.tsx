import Link from "next/link";
import { Code2, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TechnicalChallengeCardProps {
  applicationId: string;
  roleTitle?: string;
}

export function TechnicalChallengeCard({ applicationId, roleTitle = "" }: TechnicalChallengeCardProps) {
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
        <Link href={`/applications/${applicationId}/challenge`}>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            Open Sandbox
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
