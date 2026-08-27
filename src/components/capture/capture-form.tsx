"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Plus, Loader2, Sparkles } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeJobAction, type AnalyzeJobActionState } from "@/lib/jobs/actions";

function SubmitButton({ handleAutoCapture, autoLoading }: { handleAutoCapture: () => void, autoLoading: boolean }) {
  const { pending } = useFormStatus();
  const loading = pending || autoLoading;
  
  return (
    <Button 
      type="button"
      size="lg" 
      className="h-32 text-lg border-2 border-dashed bg-muted/50 hover:bg-muted"
      variant="outline"
      onClick={handleAutoCapture}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 size-6 animate-spin text-primary" /> : <Copy className="mr-2 size-6" />}
      {loading ? "Analyzing job with AI..." : "Paste & Analyze Job"}
    </Button>
  );
}

export function CaptureForm() {
  const searchParams = useSearchParams();
  const [autoLoading, setAutoLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useFormState<AnalyzeJobActionState, FormData>(
    analyzeJobAction,
    {},
  );

  useEffect(() => {
    // If the bookmarklet focused the window, we try to grab the clipboard automatically
    if (searchParams.get("focus") === "1") {
      handleAutoCapture();
    }
  }, [searchParams]);

  const handleAutoCapture = async () => {
    try {
      setAutoLoading(true);
      const text = await navigator.clipboard.readText();
      if (!text || text.length < 50) {
        setAutoLoading(false);
        alert("Clipboard doesn't seem to contain a job description. Please copy it first!");
        return;
      }
      
      const formData = new FormData();
      formData.append("inputMethod", "PASTED_TEXT");
      formData.append("text", text);
      
      // Dispatch the server action using the form reference or direct call
      // Since analyzeJobAction expects (state, formData), we can just call it
      const res = await analyzeJobAction({}, formData);
      if (res.error) {
        alert(res.error);
      }
      setAutoLoading(false);
    } catch (e) {
      console.error(e);
      setAutoLoading(false);
      alert("Failed to read clipboard or analyze job. Make sure you granted clipboard permissions.");
    }
  };

  const bookmarkletCode = `javascript:(function(){const t=window.location.href+'\n\n'+document.body.innerText;navigator.clipboard.writeText(t).then(()=>{window.open('https://workly.vercel.app/capture?focus=1','_blank');});})();`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            Install the Bookmarklet
          </CardTitle>
          <CardDescription>
            Drag this button to your browser's bookmarks bar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-primary/20 rounded-xl bg-background">
            <a 
              href={bookmarkletCode}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-transform hover:scale-105 active:scale-95 cursor-grab"
            >
              <Plus className="mr-2 size-4" />
              Save to Workly
            </a>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How to use it:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Drag the button above to your bookmarks bar.</li>
              <li>Open any job on LinkedIn, Indeed, or a company site.</li>
              <li>Click the bookmark. It will automatically copy the job and send it to Workly.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Capture</CardTitle>
          <CardDescription>
            Click here if you used the bookmarklet or have a job description in your clipboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={formAction} ref={formRef} className="flex flex-col gap-4">
            <SubmitButton handleAutoCapture={handleAutoCapture} autoLoading={autoLoading} />
            {state.error && (
              <p className="text-sm text-destructive text-center">{state.error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
