"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiProgress } from "@/components/shared/ai-progress";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { savedLabel, type EditSaveState } from "@/components/opportunities/use-saved-tool";
import { generateLinkedInMakeoverAction, saveLinkedInEditsAction } from "@/lib/career/linkedin-actions";
import { ABOUT_MAX, HEADLINE_MAX, type LinkedInMakeover as Makeover } from "@/lib/career/linkedin-core";
import { cn } from "@/lib/utils";

/**
 * The makeover itself: three headline options, the About section and the
 * five skills to pin, each with its own copy button and LinkedIn's
 * character limit shown, so it goes straight into the profile.
 */
export function LinkedInMakeover({
  initial,
  initialSavedAt,
  initialEdited,
  currentHeadline,
  targetRole,
}: {
  initial: Makeover | null;
  initialSavedAt: string | null;
  initialEdited: boolean;
  currentHeadline: string | null;
  targetRole: string | null;
}) {
  const [data, setData] = useState<Makeover | null>(initial);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [edited, setEdited] = useState(initialEdited);
  const [saveState, setSaveState] = useState<EditSaveState>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function generate() {
    setConfirm(false);
    setLoading(true);
    setError(null);
    try {
      const res = await generateLinkedInMakeoverAction();
      if ("error" in res) setError(res.error);
      else {
        setData(res.data);
        setSavedAt(res.savedAt);
        setEdited(false);
        setSaveState("idle");
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setLoading(false);
  }

  function edit(next: Makeover, fields: Record<string, unknown>) {
    setData(next);
    setEdited(true);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await saveLinkedInEditsAction(fields);
        if ("error" in res) setSaveState("error");
        else {
          setSaveState("saved");
          setSavedAt(res.savedAt);
        }
      } catch {
        setSaveState("error");
      }
    }, 800);
  }

  if (!data) {
    return (
      <section className="flex flex-col items-start gap-5 feature-panel p-6 sm:p-8">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            A LinkedIn profile recruiters {targetRole ? `searching for ${targetRole} roles` : "searching for your next role"} will find
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Three headline options, an About section and the five skills to pin, written from your real experience. Nothing
            added that isn&apos;t on your profile.
          </p>
          {currentHeadline && (
            <p className="text-sm text-muted-foreground">
              Your headline now: <span className="text-foreground">{currentHeadline}</span>
            </p>
          )}
        </div>
        {loading ? (
          <AiProgress
            steps={["Reading your profile", "Finding what recruiters search for", "Writing three headlines", "Writing your About section", "Checking every fact against your profile"]}
            stepSeconds={6}
            note="Usually 20-30 seconds. It's saved once it's written."
          />
        ) : (
          <Button size="lg" onClick={generate}>
            Write my LinkedIn profile
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    );
  }

  const aboutLength = data.about.length;

  return (
    <div className="flex flex-col gap-6">
      {data.unverifiedNumbers.length > 0 && (
        <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            Check <span className="font-medium">{data.unverifiedNumbers.join(", ")}</span>. They aren&apos;t on your profile, so keep
            them only if they&apos;re true.
          </span>
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Headline</h2>
          <span className="text-xs text-muted-foreground">Pick one. LinkedIn allows {HEADLINE_MAX} characters.</span>
        </div>
        {currentHeadline && (
          <p className="text-sm text-muted-foreground">
            Now: <span className="line-through decoration-muted-foreground/40">{currentHeadline}</span>
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {data.headlines.map((h, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{h.angle || `Option ${i + 1}`}</span>
              <Textarea
                aria-label={`Headline option ${i + 1}`}
                value={h.text}
                maxLength={HEADLINE_MAX}
                onChange={(e) => {
                  const headlines = data.headlines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x));
                  edit({ ...data, headlines }, { headlines: headlines.map((x) => x.text) });
                }}
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-[15px] font-medium leading-snug shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {h.text.length}/{HEADLINE_MAX}
                </span>
                <CopyButton text={h.text} label="Copy" variant="outline" size="sm" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">About</h2>
          <span className={cn("text-xs tabular-nums", aboutLength > ABOUT_MAX - 100 ? "text-warning" : "text-muted-foreground")}>
            {aboutLength}/{ABOUT_MAX}
          </span>
        </div>
        <Textarea
          aria-label="About section"
          value={data.about}
          maxLength={ABOUT_MAX}
          onChange={(e) => edit({ ...data, about: e.target.value }, { about: e.target.value })}
          className="min-h-[260px] resize-none border-border bg-background px-4 py-3 text-[15px] leading-7 shadow-none"
        />
        <div className="flex justify-end">
          <CopyButton text={data.about} label="Copy About" />
        </div>
      </section>

      {data.topSkills.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Top skills to pin</h2>
            <CopyButton text={data.topSkills.join(", ")} label="Copy" variant="outline" size="sm" />
          </div>
          <ul className="flex flex-wrap gap-2">
            {data.topSkills.map((s) => (
              <li key={s} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-foreground">
                {s}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            On LinkedIn: open your profile, then the pencil on About, and add these under &ldquo;Top skills&rdquo;.
          </p>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {confirm ? (
          <>
            <span className="text-sm text-foreground">{edited ? "Replace your edited version?" : "Write a new version?"}</span>
            <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
              Yes, rewrite
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setConfirm(true)} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Writing…" : "New version"}
          </Button>
        )}
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {savedLabel(saveState, edited, savedAt)}
        </span>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
