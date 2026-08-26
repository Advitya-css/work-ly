import Link from "next/link";
import { Code2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TechnicalChallengeCardProps {
  applicationId: string;
}

export function TechnicalChallengeCard({ applicationId }: TechnicalChallengeCardProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-5" />
          Technical Sandbox
        </CardTitle>
        <CardDescription>
          Generate a realistic, domain-specific coding challenge based on this company's exact tech stack and business model. Get an AI code review on your solution.
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
