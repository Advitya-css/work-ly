"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useActionState, useEffect, useState } from "react";
import { Loader2, ScanSearch, AlertCircle, Bookmark } from "lucide-react";
import { decodeCapture, type CapturedJob } from "@/lib/capture/capture";

import { analyzeJobAction, type AnalyzeJobActionState } from "@/lib/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialState: AnalyzeJobActionState = {};

export function JobInputForm() {
  const [state, formAction, pending] = useActionState(analyzeJobAction, initialState);
  const [method, setMethod] = useState<"PASTED_TEXT" | "URL">("PASTED_TEXT");
  // A job sent here by the "Save to Work-ly" button arrives in the URL
  // fragment. It prefills the form for review - it is never submitted on
  // its own - and the fragment is cleared so a refresh doesn't re-apply it.
  const [captured, setCaptured] = useState<CapturedJob | null>(null);
  useEffect(() => {
    const job = decodeCapture(window.location.hash);
    if (!job) return;
    setCaptured(job);
    setMethod("PASTED_TEXT");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="inputMethod" value={method} />
      {captured?.url && <input type="hidden" name="sourceUrl" value={captured.url} />}

      {captured && (
        <Alert>
          <Bookmark />
          <AlertDescription>
            Captured from {captured.site || "the page you were on"}. Check the description below is the job (not
            the whole page), then press Analyze.
          </AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={method} onValueChange={(v) => setMethod(v as "PASTED_TEXT" | "URL")}>
        <TabsList>
          <TabsTrigger value="PASTED_TEXT">Paste description</TabsTrigger>
          <TabsTrigger value="URL">Paste a URL</TabsTrigger>
        </TabsList>

        <TabsContent value="PASTED_TEXT" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-title">Job title (optional)</Label>
              <Input key={`t-${captured?.url ?? ""}`} id="job-title" name="jobTitle" defaultValue={state.values?.jobTitle ?? captured?.title ?? ""} placeholder="e.g. Product Analytics Intern" disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-company">Company (optional)</Label>
              <Input key={`c-${captured?.url ?? ""}`} id="job-company" name="jobCompany" defaultValue={state.values?.jobCompany ?? captured?.company ?? ""} placeholder="e.g. Stripe" disabled={pending} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-text">Job description</Label>
            <Textarea
              key={`x-${captured?.url ?? ""}`}
              defaultValue={state.values?.text ?? captured?.text ?? ""}
              id="job-text"
              name="text"
              rows={12}
              placeholder="Paste the responsibilities, requirements, and qualifications here."
              disabled={pending}
            />
            {state.fieldErrors?.text && <p className="text-xs text-destructive">{state.fieldErrors.text}</p>}
          </div>
        </TabsContent>

        <TabsContent value="URL" className="mt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-url">Job posting URL</Label>
            <Input
              id="job-url"
              name="url"
              type="url"
              defaultValue={state.values?.url ?? ""}
              placeholder="https://company.com/careers/senior-engineer"
              disabled={pending}
            />
            {state.fieldErrors?.url && <p className="text-xs text-destructive">{state.fieldErrors.url}</p>}
            <p className="text-xs text-muted-foreground">
              We&apos;ll fetch the public page as-is. If it requires sign-in or blocks automated requests,
              we&apos;ll ask you to paste the description instead. Work-ly never bypasses logins or bot
              detection.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? (
          <>
            <WorklyLoader className="animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <ScanSearch />
            Analyze this job
          </>
        )}
      </Button>
    </form>
  );
}
