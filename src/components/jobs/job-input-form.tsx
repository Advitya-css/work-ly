"use client";

import { useActionState, useState } from "react";
import { Loader2, ScanSearch, AlertCircle } from "lucide-react";

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="inputMethod" value={method} />

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

        <TabsContent value="PASTED_TEXT" className="mt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-text">Job description</Label>
            <Textarea
              id="job-text"
              name="text"
              rows={12}
              placeholder="Paste the full job posting here. Title, responsibilities, requirements, everything."
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
              placeholder="https://company.com/careers/senior-engineer"
              disabled={pending}
            />
            {state.fieldErrors?.url && <p className="text-xs text-destructive">{state.fieldErrors.url}</p>}
            <p className="text-xs text-muted-foreground">
              We&apos;ll fetch the public page as-is. If it requires sign-in or blocks automated requests,
              we&apos;ll ask you to paste the description instead. Workly never bypasses logins or bot
              detection.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
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
