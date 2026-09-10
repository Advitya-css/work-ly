"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResumeUploader } from "@/components/career/resume-uploader";
import { completeOnboardingAction } from "@/lib/onboarding/actions";

export function UploadStep() {
  const router = useRouter();

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add your resume</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop your resume below. Work-ly will instantly extract your profile and run a personalized AI search to find your top 5 matching jobs in seconds.
        </p>
      </div>

      <Card>
        <CardContent>
          <ResumeUploader autoOnboardAndRedirect={true} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 text-sm">
        <form action={completeOnboardingAction}>
          <Button type="submit" variant="link" size="sm" className="text-muted-foreground">
            Skip for now: I&apos;ll add this later
          </Button>
        </form>

      </div>
    </div>
  );
}
