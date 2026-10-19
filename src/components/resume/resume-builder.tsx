"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { AlertTriangle, Check, Copy, Download, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { AiProgress } from "@/components/shared/ai-progress";
import { generateTailoredResumeDocAction, saveTailoredResumeEditsAction } from "@/lib/resume/actions";
import { resumeAsText, resumeChangeStats, type TailoredResume } from "@/lib/resume/tailored-resume-core";
import { cn } from "@/lib/utils";

interface Candidate {
  name: string;
  email: string;
  location: string | null;
  headline: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type Path = (string | number)[];

function ago(iso: string | null): string | null {
  if (!iso) return null;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function setAt(target: unknown, path: Path, value: unknown) {
  let node = target as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (node[key] == null || typeof node[key] !== "object") node[key] = typeof path[i + 1] === "number" ? [] : {};
    node = node[key] as Record<string | number, unknown>;
  }
  node[path[path.length - 1]] = value;
}

/**
 * Text you can click and change. Uncontrolled on purpose: React re-rendering
 * a contentEditable node while you type fights the caret, so the edit is
 * read once, on blur, and handed up.
 */
function Editable({
  value,
  onCommit,
  as: Tag = "span",
  className,
  label,
}: {
  value: string;
  onCommit: (text: string) => void;
  as?: ElementType;
  className?: string;
  label?: string;
}) {
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck
      aria-label={label}
      className={cn(
        "rounded-[3px] outline-none transition-colors hover:bg-sky-50 focus:bg-sky-50 focus:ring-1 focus:ring-sky-300",
        className,
      )}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        // One line per field: Enter finishes the edit instead of adding a break.
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = e.currentTarget.innerText.replace(/\s+/g, " ").trim();
        // Clearing a line removes it (from the page, the PDF and the saved copy).
        e.currentTarget.closest("li")?.setAttribute("data-empty", text ? "false" : "true");
        if (text !== value) onCommit(text);
      }}
    >
      {value}
    </Tag>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{children}</h2>;
}

/** The line a bullet was rewritten from, shown under it when "Show changes" is on. Never printed. */
function Was({ text, added }: { text: string | null | undefined; added?: string[] }) {
  if (!text) return null;
  return (
    <span className="mt-0.5 block text-[11.5px] leading-snug text-neutral-400 print:hidden" contentEditable={false}>
      <span className="font-medium text-neutral-500">Was: </span>
      {text}
      {added && added.length > 0 && (
        <span className="mt-0.5 block text-amber-700">
          <span className="font-medium">New wording, check it&apos;s true: </span>
          {added.join(", ")}
        </span>
      )}
    </span>
  );
}

/**
 * The tailored resume. The sheet is a document, not app UI: it stays
 * black-on-white in both themes because that's what gets printed and sent.
 *
 * It's built once and kept: opening it again is instant and free, any text
 * can be edited in place, and edits are saved as you go. "Show changes"
 * puts your original line under every bullet that was rewritten, so you can
 * see exactly what was done for this job and undo anything you don't like.
 */
export function ResumeBuilder({
  opportunityId,
  candidate,
  jobLabel,
  autoStart = false,
  initial = null,
  initialSavedAt = null,
  initialEdited = false,
}: {
  opportunityId: string;
  candidate: Candidate;
  jobLabel: string;
  /** Start building straight away (arriving from "Open my tailored resume"). */
  autoStart?: boolean;
  initial?: TailoredResume | null;
  initialSavedAt?: string | null;
  initialEdited?: boolean;
}) {
  const [resume, setResume] = useState<TailoredResume | null>(initial);
  const [rev, setRev] = useState(0);
  const draft = useRef<TailoredResume | null>(initial ? structuredClone(initial) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(initialEdited ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [edited, setEdited] = useState(initialEdited);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function generate() {
    setConfirmRebuild(false);
    setLoading(true);
    setError(null);
    try {
      const res = await generateTailoredResumeDocAction(opportunityId);
      if ("error" in res) setError(res.error);
      else {
        draft.current = structuredClone(res.data);
        setResume(res.data);
        setRev((r) => r + 1);
        setSavedAt(res.savedAt);
        setEdited(false);
        setSaveState("idle");
        // The first look should show the work: every rewritten line with the original under it.
        setShowChanges(true);
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setLoading(false);
  }

  // One click from the job page to a resume: no second "Build" press.
  const started = useRef(false);
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      // A refresh shouldn't build (and spend) it again.
      window.history.replaceState(null, "", window.location.pathname);
      if (!initial) void generate();
    }
    // generate is stable enough for a one-time start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      if (!draft.current) return;
      try {
        const res = await saveTailoredResumeEditsAction(opportunityId, draft.current);
        if ("error" in res) setSaveState("error");
        else {
          setSaveState("saved");
          setSavedAt(res.savedAt);
        }
      } catch {
        setSaveState("error");
      }
    }, 700);
  }

  const [, setTick] = useState(0);
  function commit(path: Path, value: unknown) {
    if (!draft.current) return;
    setAt(draft.current, path, value);
    // Rewording a line yourself settles the "check this wording" flag on it.
    if (path.length === 4 && path[2] === "bullets") {
      const [section, i, , j] = path as ["roles" | "projects", number, string, number];
      const block = draft.current[section]?.[i];
      if (block?.added) block.added[j] = [];
    }
    setEdited(true);
    setTick((t) => t + 1);
    scheduleSave();
  }

  const fallbackContact = [candidate.email, candidate.location].filter(Boolean).join(" · ");

  function copyText() {
    if (!draft.current) return;
    const text = resumeAsText(draft.current, { name: candidate.name || "Your Name", headline: candidate.headline, contact: fallbackContact });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    const previous = document.title;
    const name = draft.current?.header?.name ?? candidate.name;
    document.title = `${name || "Resume"} - ${jobLabel}`.replace(/[\\/:*?"<>|]/g, "");
    window.print();
    document.title = previous;
  }

  if (!resume) {
    return (
      <section className="flex flex-col items-start gap-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card p-6 shadow-sm sm:p-8">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">A resume written for this job, from your real experience</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your most relevant lines first, in this posting&apos;s language, with every number kept. Nothing is added
            that isn&apos;t on your profile, and you can edit any word before you download.
          </p>
        </div>
        {loading ? (
          <AiProgress
            steps={[
              "Reading the job",
              "Picking your most relevant experience",
              "Rewriting each line in the job's language",
              "Ordering your skills by what it asks for",
              "Checking every fact against your profile",
            ]}
            stepSeconds={8}
            note="Usually 30-45 seconds. It's saved once it's built."
          />
        ) : (
          <Button onClick={generate} size="lg" className="gap-2">
            <FileText className="size-4" />
            Build my resume
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    );
  }

  const stats = resumeChangeStats(draft.current ?? resume);
  const header = resume.header ?? {};
  const coverageTotal = resume.keywordsCovered.length + resume.keywordsMissing.length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <style>{`
        @media print {
          @page { size: auto; margin: 14mm; }
          body * { visibility: hidden !important; }
          #resume-sheet, #resume-sheet * { visibility: visible !important; }
          #resume-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
          #resume-sheet [data-empty="true"] { display: none !important; }
        }
      `}</style>

      <div className="relative mx-auto w-full max-w-[816px] min-w-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-md bg-background/80 pt-24 backdrop-blur-[1px] print:hidden">
            <AiProgress
              steps={["Reading the job", "Picking your most relevant experience", "Rewriting each line", "Checking every fact against your profile"]}
              stepSeconds={8}
              note="Usually 30-45 seconds."
            />
          </div>
        )}
        <div
          id="resume-sheet"
          key={rev}
          className="w-full rounded-md border border-border bg-white px-6 py-8 text-[13px] leading-relaxed text-neutral-900 shadow-sm sm:px-10 sm:py-10"
          style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
        >
          <header className="border-b border-neutral-300 pb-3">
            <Editable
              as="h1"
              label="Your name"
              value={header.name ?? (candidate.name || "Your Name")}
              onCommit={(t) => commit(["header", "name"], t)}
              className="block text-2xl font-semibold tracking-tight"
            />
            {(header.headline ?? candidate.headline) && (
              <Editable
                as="p"
                label="Headline"
                value={header.headline ?? candidate.headline ?? ""}
                onCommit={(t) => commit(["header", "headline"], t)}
                className="mt-0.5 block text-sm text-neutral-700"
              />
            )}
            <Editable
              as="p"
              label="Contact details"
              value={header.contact ?? fallbackContact}
              onCommit={(t) => commit(["header", "contact"], t)}
              className="mt-1 block text-xs text-neutral-600"
            />
          </header>

          {resume.summary && (
            <section className="mt-4">
              <SectionTitle>Summary</SectionTitle>
              <Editable as="p" label="Summary" value={resume.summary} onCommit={(t) => commit(["summary"], t)} className="mt-1 block" />
            </section>
          )}

          {resume.roles.length > 0 && (
            <section className="mt-4">
              <SectionTitle>Experience</SectionTitle>
              <div className="mt-1 flex flex-col gap-3">
                {resume.roles.map((role, i) => (
                  <div key={i}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p className="font-semibold">
                        <Editable value={role.title} label="Job title" onCommit={(t) => commit(["roles", i, "title"], t)} />
                        <span className="font-normal text-neutral-700">
                          {" · "}
                          <Editable value={role.company} label="Company" onCommit={(t) => commit(["roles", i, "company"], t)} />
                        </span>
                        {role.location && <span className="font-normal text-neutral-500"> · {role.location}</span>}
                      </p>
                      <Editable
                        as="p"
                        value={role.dates}
                        label="Dates"
                        onCommit={(t) => commit(["roles", i, "dates"], t)}
                        className="text-xs tabular-nums text-neutral-600"
                      />
                    </div>
                    {role.bullets.length > 0 && (
                      <ul className="mt-1 list-disc pl-5">
                        {role.bullets.map((b, j) => (
                          <li key={j} className={cn("data-[empty=true]:hidden", showChanges && role.from?.[j] && "marker:text-sky-500")}>
                            <Editable
                              value={b}
                              label="Resume line"
                              onCommit={(t) => commit(["roles", i, "bullets", j], t)}
                            />
                            {showChanges && <Was text={role.from?.[j]} added={draft.current?.roles[i]?.added?.[j]} />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.projects.length > 0 && (
            <section className="mt-4">
              <SectionTitle>Projects</SectionTitle>
              <div className="mt-1 flex flex-col gap-2">
                {resume.projects.map((p, i) => (
                  <div key={i}>
                    <Editable as="p" value={p.name} label="Project name" onCommit={(t) => commit(["projects", i, "name"], t)} className="block font-semibold" />
                    <ul className="list-disc pl-5">
                      {p.bullets.map((b, j) => (
                        <li key={j} className={cn("data-[empty=true]:hidden", showChanges && p.from?.[j] && "marker:text-sky-500")}>
                          <Editable value={b} label="Project line" onCommit={(t) => commit(["projects", i, "bullets", j], t)} />
                          {showChanges && <Was text={p.from?.[j]} added={draft.current?.projects[i]?.added?.[j]} />}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.skills.length > 0 && (
            <section className="mt-4">
              <SectionTitle>Skills</SectionTitle>
              <Editable
                as="p"
                label="Skills"
                value={resume.skills.join(" · ")}
                onCommit={(t) => commit(["skills"], t.split(/\s*[·,|]\s*/).filter(Boolean))}
                className="mt-1 block"
              />
            </section>
          )}

          {resume.education.length > 0 && (
            <section className="mt-4">
              <SectionTitle>Education</SectionTitle>
              <div className="mt-1 flex flex-col gap-1">
                {resume.education.map((e, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <Editable as="p" value={e.line} label="Education" onCommit={(t) => commit(["education", i, "line"], t)} />
                    <Editable
                      as="p"
                      value={e.dates}
                      label="Education dates"
                      onCommit={(t) => commit(["education", i, "dates"], t)}
                      className="min-w-[2rem] text-xs tabular-nums text-neutral-600"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.certifications.length > 0 && (
            <section className="mt-4">
              <SectionTitle>Certifications</SectionTitle>
              <Editable
                as="p"
                label="Certifications"
                value={resume.certifications.join(" · ")}
                onCommit={(t) => commit(["certifications"], t.split(/\s*·\s*/).filter(Boolean))}
                className="mt-1 block"
              />
            </section>
          )}
        </div>
      </div>

      <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:w-80 lg:shrink-0 print:hidden">
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Button onClick={download} size="lg" className="gap-2">
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={copyText} className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy as text"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground" aria-live="polite">
            {saveState === "saving"
              ? "Saving your edits…"
              : saveState === "error"
                ? "Couldn't save your last edit. Copy it somewhere safe and try again."
                : edited
                  ? `Your edits are saved${savedAt ? ` · ${ago(savedAt)}` : ""}.`
                  : `Click any text to edit it. Saved${savedAt ? ` · built ${ago(savedAt)}` : ""}.`}
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">What changed for this job</h3>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: stats.rewritten, label: "lines rewritten" },
              { n: stats.kept, label: "kept as written" },
              { n: stats.leftOut, label: "left out" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-muted/60 px-2 py-2.5">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-xl font-semibold tabular-nums text-foreground">{s.n}</dd>
                <span className="block text-[11px] leading-tight text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </dl>
          {stats.rewritten > 0 && (
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
              Show my original lines
              <Switch checked={showChanges} onCheckedChange={setShowChanges} />
            </label>
          )}
          {stats.toCheck > 0 && (
            <div className="flex flex-col items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">
              <p>
                {stats.toCheck === 1 ? "1 line uses" : `${stats.toCheck} lines use`} wording that isn&apos;t on your profile.
                Keep it only if it&apos;s true.
              </p>
              {!showChanges && (
                <button type="button" onClick={() => setShowChanges(true)} className="font-medium text-primary underline-offset-4 hover:underline">
                  Show me where
                </button>
              )}
            </div>
          )}
          {stats.leftOut > 0 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Left-out lines are still on your profile. They just don&apos;t help for this job.
            </p>
          )}
        </section>

        {resume.unverifiedNumbers.length > 0 && (
          <section className="flex gap-2 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p>
              Check <span className="font-medium">{resume.unverifiedNumbers.join(", ")}</span>. They aren&apos;t in the
              lines they came from, so keep them only if they&apos;re true.
            </p>
          </section>
        )}

        {coverageTotal > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">The job&apos;s key terms</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {resume.keywordsCovered.length} of {coverageTotal} covered
              </span>
            </div>
            {resume.keywordsCovered.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {resume.keywordsCovered.map((k) => (
                  <li key={k} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs text-foreground">
                    <Check className="size-3 text-success" aria-hidden />
                    {k}
                  </li>
                ))}
              </ul>
            )}
            {resume.keywordsMissing.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Not on your profile, so left out. Add them only once you can back them up.</p>
                <ul className="flex flex-wrap gap-1.5">
                  {resume.keywordsMissing.map((k) => (
                    <li key={k} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col gap-2 px-1">
          {confirmRebuild ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm">
              <p className="text-foreground">
                Build it again from your profile?{edited ? " Your edits on this page will be replaced." : ""}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={generate} disabled={loading}>
                  Rebuild
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRebuild(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmRebuild(true)} disabled={loading} className="w-fit gap-2 text-muted-foreground">
              {loading ? <WorklyLoader className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Rebuild from my profile
            </Button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </aside>
    </div>
  );
}
