"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiProgress } from "@/components/shared/ai-progress";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { savedLabel, type EditSaveState } from "@/components/opportunities/use-saved-tool";
import { generateLinkedInMakeoverAction, saveLinkedInEditsAction } from "@/lib/career/linkedin-actions";
import { ABOUT_MAX, HEADLINE_MAX, type LinkedInMakeover as Makeover } from "@/lib/career/linkedin-core";
import { cn } from "@/lib/utils";
import { InspectorSection, KitLabel, Studio } from "@/components/kit/kit-parts";
import { WritingState } from "@/components/kit/writing-state";

/** Initials for the preview's avatar. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "You";
}

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
  person,
}: {
  /** Name and location for the "how recruiters see you" preview. */
  person?: { name: string; location: string | null };
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
  const [chosen, setChosen] = useState(0);
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

  if (!data && loading) {
    return (
      <WritingState
        paper={false}
        lines={12}
        stepSeconds={6}
        steps={["Reading your profile", "Finding what recruiters search for", "Writing three headlines", "Writing your About section", "Checking every fact against your profile"]}
      />
    );
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
  const pick = data.headlines[Math.min(chosen, data.headlines.length - 1)];

  return (
    <Studio
      document={
        <div className="flex flex-col gap-4">
          {data.unverifiedNumbers.length > 0 && (
            <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                Check <span className="font-medium">{data.unverifiedNumbers.join(", ")}</span>. They aren&apos;t on your
                profile, so keep them only if they&apos;re true.
              </span>
            </p>
          )}

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">Headline</h2>
              <span className="text-xs text-muted-foreground">Pick one. LinkedIn allows {HEADLINE_MAX} characters.</span>
            </div>
            {currentHeadline && (
              <p className="text-[13px] text-muted-foreground">
                Now: <span className="line-through decoration-muted-foreground/40">{currentHeadline}</span>
              </p>
            )}
            <ol role="radiogroup" aria-label="Headline options" className="flex flex-col gap-2">
              {data.headlines.map((h, i) => {
                const selected = i === chosen;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-4 transition-colors",
                      selected ? "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20" : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <KitLabel className={selected ? "text-primary" : undefined}>{h.angle || `Option ${i + 1}`}</KitLabel>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setChosen(i)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium transition-colors",
                          selected ? "bg-primary-solid text-primary-solid-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} aria-hidden />}
                        {selected ? "Previewing" : "Preview this"}
                      </button>
                    </div>
                    <Textarea
                      aria-label={`Headline option ${i + 1}`}
                      value={h.text}
                      maxLength={HEADLINE_MAX}
                      onFocus={() => setChosen(i)}
                      onChange={(e) => {
                        const headlines = data.headlines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x));
                        edit({ ...data, headlines }, { headlines: headlines.map((x) => x.text) });
                      }}
                      className="min-h-0 resize-none border-0 bg-transparent p-0 text-[15px] font-medium leading-snug shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                        {h.text.length}/{HEADLINE_MAX}
                      </span>
                      <CopyButton text={h.text} label="Copy" variant="ghost" size="sm" />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">About</h2>
              <span className="flex items-center gap-2">
                <span className={cn("font-mono text-[11.5px] tabular-nums", aboutLength > ABOUT_MAX - 100 ? "text-warning" : "text-muted-foreground")}>
                  {aboutLength}/{ABOUT_MAX}
                </span>
                <CopyButton text={data.about} label="Copy" variant="ghost" size="sm" />
              </span>
            </div>
            <Textarea
              aria-label="About section"
              value={data.about}
              maxLength={ABOUT_MAX}
              onChange={(e) => edit({ ...data, about: e.target.value }, { about: e.target.value })}
              className="min-h-[260px] resize-none border-border bg-background px-4 py-3 text-[15px] leading-7 shadow-none [field-sizing:content]"
            />
          </section>

          {data.topSkills.length > 0 && (
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-foreground">Top skills to pin</h2>
                <CopyButton text={data.topSkills.join(", ")} label="Copy" variant="ghost" size="sm" />
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {data.topSkills.map((s) => (
                  <li key={s} className="rounded-md border border-border bg-background px-2.5 py-1 text-[13px] font-medium text-foreground">
                    {s}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                On LinkedIn: open your profile, then the pencil on About, and add these under &ldquo;Top skills&rdquo;.
              </p>
            </section>
          )}
        </div>
      }
      inspector={
        <>
          <InspectorSection title="How recruiters see you">
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="h-12 bg-gradient-to-r from-[#a3407b]/70 via-[#6d2352]/60 to-[#2b1a2f]/70" aria-hidden />
              <div className="flex flex-col gap-1 px-3.5 pb-3.5">
                <span className="-mt-6 flex size-12 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-semibold text-foreground">
                  {initials(person?.name ?? "")}
                </span>
                <span className="mt-1 text-[14px] font-semibold text-foreground">{person?.name || "Your name"}</span>
                <span className="line-clamp-2 text-[12.5px] leading-snug text-foreground/85">{pick?.text}</span>
                {person?.location && <span className="text-[11.5px] text-muted-foreground">{person.location}</span>}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Search results show about the first 120 characters of your headline. Lead with what a recruiter types.
            </p>
            <CopyButton text={pick?.text ?? ""} label="Copy this headline" />
          </InspectorSection>

          <InspectorSection>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {savedLabel(saveState, edited, savedAt) || "Click any text to edit it."}
            </p>
            {confirm ? (
              <div className="flex flex-col gap-2 text-[13px]">
                <span>{edited ? "Replace your edited version?" : "Write a new version?"}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={generate} disabled={loading}>
                    Yes, rewrite
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConfirm(true)} disabled={loading}>
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                {loading ? "Writing…" : "Write a new version"}
              </Button>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </InspectorSection>
        </>
      }
    />
  );
}
