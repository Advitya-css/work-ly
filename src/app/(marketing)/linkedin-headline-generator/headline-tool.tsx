"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { HEADLINE_MAX, type LinkedInHeadline } from "@/lib/career/linkedin-core";
import { freeHeadlinesAction } from "./actions";

export function HeadlineTool() {
  const [currentRole, setCurrentRole] = useState("");
  const [about, setAbout] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headlines, setHeadlines] = useState<LinkedInHeadline[] | null>(null);
  const [check, setCheck] = useState<string[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await freeHeadlinesAction({ currentRole, about, targetRole });
      if ("error" in res) setError(res.error);
      else {
        setHeadlines(res.headlines);
        setCheck(res.check);
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Your current job title
            <Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Data Analyst" required maxLength={120} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>
              Role you want next <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior Data Analyst" maxLength={120} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          What you&apos;ve done
          <Textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Paste your resume, or a few lines: the tools you use, what you've built or improved, and any numbers."
            className="min-h-[140px] text-sm font-normal"
            maxLength={4000}
            required
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Free, no account needed. Uses only what you write here.</p>
          <Button type="submit" size="lg" disabled={busy} className="gap-2">
            <Sparkles className="size-4" />
            {busy ? "Writing your headlines…" : "Write my headlines"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {headlines && (
        <section aria-live="polite" className="flex flex-col gap-3">
          {check.length > 0 && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground">
              Check <span className="font-medium">{check.join(", ")}</span>: it isn&apos;t in what you wrote, so keep it only if it&apos;s true.
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {headlines.map((h, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{h.angle || `Option ${i + 1}`}</span>
                <p className="text-[15px] font-medium leading-snug text-foreground">{h.text}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {h.text.length}/{HEADLINE_MAX}
                  </span>
                  <CopyButton text={h.text} label="Copy" variant="outline" size="sm" />
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-foreground">Now the rest of your profile</p>
              <p className="text-sm text-muted-foreground">
                Work-ly reads your resume and writes your About section and the five skills to pin, then a resume tailored to every job
                you apply to.
              </p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href="/signup?from=linkedin-headlines">
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
