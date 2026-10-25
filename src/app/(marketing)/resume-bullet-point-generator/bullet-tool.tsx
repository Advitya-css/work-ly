"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { rewriteBulletAction, type BulletOption } from "./actions";

export function BulletTool() {
  const [bullet, setBullet] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<BulletOption[] | null>(null);
  const [original, setOriginal] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await rewriteBulletAction({ bullet, target });
      if ("error" in res) setError(res.error);
      else {
        setOptions(res.options);
        setOriginal(bullet.trim());
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          One line from your resume
          <Textarea
            value={bullet}
            onChange={(e) => setBullet(e.target.value)}
            placeholder="e.g. Responsible for weekly sales reports for the regional team"
            className="min-h-[88px] text-sm font-normal"
            maxLength={400}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            The job you&apos;re applying for <span className="font-normal text-muted-foreground">(optional: paste the posting or its key skills)</span>
          </span>
          <Textarea
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. Business Analyst: SQL, stakeholder reporting, Power BI"
            className="min-h-[72px] text-sm font-normal"
            maxLength={3000}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Free, no account needed. Keeps your numbers; never adds new ones.</p>
          <Button type="submit" size="lg" disabled={busy} className="gap-2">
            <Sparkles className="size-4" />
            {busy ? "Rewriting…" : "Rewrite my line"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {options && (
        <section aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Was: <span className="text-foreground/80 line-through decoration-muted-foreground/40">{original}</span>
          </p>
          <ol className="flex flex-col gap-3">
            {options.map((o, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{o.angle || `Option ${i + 1}`}</span>
                <p className="text-[15px] leading-snug text-foreground">{o.text}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-warning">{o.check.length > 0 ? `New wording, check it's true: ${o.check.join(", ")}` : ""}</span>
                  <CopyButton text={o.text} label="Copy" variant="outline" size="sm" />
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-foreground">Rewrite the whole resume for one job</p>
              <p className="text-sm text-muted-foreground">
                Work-ly reads your resume and the job, picks your most relevant lines, rewrites each one this way and gives you a
                PDF or Word file, with every original line shown underneath.
              </p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href="/signup">
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
