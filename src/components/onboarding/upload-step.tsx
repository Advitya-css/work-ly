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
          Upload a CV and Workly will draft your career profile. Education, experience, projects, and skills.
          You&apos;ll review and confirm everything before it&apos;s final.
        </p>
      </div>

      <Card>
        <CardContent>
          <ResumeUploader onComplete={() => router.push("/onboarding?step=review")} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 text-sm">
        <form action={completeOnboardingAction}>
          <Button type="submit" variant="link" size="sm" className="text-muted-foreground">
            Skip for now: I&apos;ll add this later
          </Button>
        </form>
        <span className="text-border">·</span>
        <Button type="button" variant="link" size="sm" onClick={() => router.push("/onboarding?step=review")}>
          Enter details manually
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
