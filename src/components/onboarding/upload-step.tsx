"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResumeUploader } from "@/components/career/resume-uploader";
import { completeOnboardingAction, loadSampleProfileAction } from "@/lib/onboarding/actions";

export function UploadStep({ intent = "hunt" }: { intent?: string }) {
  const router = useRouter();

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add your resume</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop your resume below. Work-ly reads it, builds your profile, then searches for the jobs that fit you best and scores each one. You&apos;ll see your top matches in about a minute.
        </p>
      </div>

      <Card>
        <CardContent>
          <ResumeUploader autoOnboardAndRedirect redirectTo={`/onboarding?step=matches&intent=${intent}`} />
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
        <form action={loadSampleProfileAction}>
          <Button type="submit" variant="outline" size="sm" className="text-muted-foreground font-medium">
            Just looking around? Try with a sample profile
          </Button>
        </form>
        <form action={completeOnboardingAction}>
          <Button type="submit" variant="link" size="sm" className="text-muted-foreground">
            Skip for now
          </Button>
        </form>
      </div>
    </div>
  );
}
