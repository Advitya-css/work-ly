import Link from "next/link";
import { Sparkles, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InterviewPrepCardProps {
  applicationId: string;
}

export function InterviewPrepCard({ applicationId }: InterviewPrepCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-5 text-primary" />
          Interview War Room
        </CardTitle>
        <CardDescription>
          Enter the Hot Seat. The AI acts as a ruthless hiring manager, asks you role-specific questions, and listens to your spoken answers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={`/applications/${applicationId}/interview`}>
          <Button className="gap-2 w-full sm:w-auto">
            <Sparkles className="size-4" />
            Enter the Prep Room
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
