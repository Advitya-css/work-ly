"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { AlertTriangle, Check, Copy, Download, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { AiProgress } from "@/components/shared/ai-progress";
import { generateTailoredResumeDocAction, saveTailoredResumeEditsAction } from "@/lib/resume/actions";
import {
  RESUME_LAYOUTS,
  cleanStyle,
  estimatePages,
  resumeAsText,
  resumeChangeStats,
  type ResumeLayout,
  type ResumeStyle,
  type TailoredResume,
} from "@/lib/resume/tailored-resume-core";
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

/**
 * Three looks, all single-column and plain text underneath, so every one of
 * them reads cleanly in an applicant-tracking system. They differ in type
 * and in how sections are marked, not in structure.
 */
const LOOKS: Record<ResumeLayout, { font: string; title: string; header: string; name: string }> = {
  clean: {
    font: "'Helvetica Neue', Arial, sans-serif",
    title: "text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500",
    header: "border-b border-neutral-300 pb-3",
    name: "text-2xl font-semibold tracking-tight",
  },
  modern: {
    font: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
    title: "border-b border-[#1f3a5f]/25 pb-0.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#1f3a5f]",
    header: "pb-1",
    name: "text-[28px] font-bold tracking-tight text-[#1f3a5f]",
  },
  traditional: {
    font: "Georgia, 'Times New Roman', serif",
    title: "border-b border-neutral-800 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-900",
    header: "border-b-2 border-neutral-800 pb-3 text-center",
    name: "text-[26px] font-normal tracking-wide",
  },
};

function SectionTitle({ children, className }: { children: string; className: string }) {
  return <h2 className={className}>{children}</h2>;
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
  const [style, setStyle] = useState<ResumeStyle>(cleanStyle(initial?.style));
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState(1);

  async function generate() {
    setConfirmRebuild(false);
    setLoading(true);
    setError(null);
    try {
      const res = await generateTailoredResumeDocAction(opportunityId);
      if ("error" in res) setError(res.error);
      else {
        // A rebuild keeps the look the user picked.
        draft.current = { ...structuredClone(res.data), style };
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

  // How many pages it will print on, kept current as text is edited. The
  // sheet on screen is narrower than a printed page (the sidebar takes
  // room), so a copy is measured off-screen at the printed width instead.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-10000px;top:0;width:720px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const copy = el.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.style.padding = "0";
        copy.style.border = "0";
        copy.style.width = "720px";
        copy.querySelectorAll(".print\\:hidden, [data-empty='true']").forEach((n) => n.remove());
        probe.replaceChildren(copy);
        setPages(estimatePages(copy.offsetHeight, 720));
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      probe.remove();
    };
  }, [rev, resume, style]);

  function changeStyle(next: ResumeStyle) {
    setStyle(next);
    if (draft.current) {
      draft.current.style = next;
      scheduleSave();
    }
  }

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

  const [wordBusy, setWordBusy] = useState(false);
  async function downloadWord() {
    if (!draft.current) return;
    setWordBusy(true);
    try {
      const { buildResumeDocx } = await import("@/lib/resume/docx");
      const blob = await buildResumeDocx(draft.current, {
        name: candidate.name || "Your Name",
        headline: candidate.headline,
        contact: fallbackContact,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = draft.current.header?.name ?? candidate.name;
      a.href = url;
      a.download = `${name || "Resume"} - ${jobLabel}.docx`.replace(/[\\/:*?"<>|]/g, "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setError("Couldn't make the Word file. Try Download PDF instead.");
    }
    setWordBusy(false);
  }

  // Printing copies the sheet to the top of the page and hides everything
  // else, so the PDF is the sheet alone, at the page's left edge, on as many
  // pages as it needs. (Hiding the rest with visibility left the sheet where
  // it sat on screen, beside the app's sidebar.) Cmd/Ctrl+P gets the same.
  useEffect(() => {
    const before = () => {
      const sheet = document.getElementById("resume-sheet");
      if (!sheet || document.getElementById("resume-print-root")) return;
      const root = document.createElement("div");
      root.id = "resume-print-root";
      root.appendChild(sheet.cloneNode(true));
      root.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
      root.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      document.body.appendChild(root);
      document.body.classList.add("printing-resume");
    };
    const after = () => {
      document.getElementById("resume-print-root")?.remove();
      document.body.classList.remove("printing-resume");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);

  function download() {
    const previous = document.title;
    const name = draft.current?.header?.name ?? candidate.name;
    document.title = `${name || "Resume"} - ${jobLabel}`.replace(/[\\/:*?"<>|]/g, "");
    window.print();
    document.title = previous;
  }

  if (!resume) {
    return (
      <section className="flex flex-col items-start gap-5 feature-panel p-6 sm:p-8">
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
  const look = LOOKS[style.layout];
  const dense = style.density === "compact";
  const gap = dense ? "mt-2.5" : "mt-4";
  const coverageTotal = resume.keywordsCovered.length + resume.keywordsMissing.length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <style>{`
        @media print {
          @page { size: auto; margin: 0.5in; }
          body.printing-resume > *:not(#resume-print-root) { display: none !important; }
          #resume-print-root { display: block !important; }
          #resume-print-root > div { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; width: 100% !important; }
          #resume-print-root [data-empty="true"] { display: none !important; }
        }
        #resume-print-root { display: none; }
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
          ref={sheetRef}
          data-layout={style.layout}
          className={cn(
            "w-full rounded-md border border-border bg-white px-6 py-8 text-neutral-900 shadow-sm sm:px-12 sm:py-12",
            dense ? "text-[12px] leading-snug" : "text-[13px] leading-relaxed",
          )}
          style={{ fontFamily: look.font }}
        >
          <header className={look.header}>
            <Editable
              as="h1"
              label="Your name"
              value={header.name ?? (candidate.name || "Your Name")}
              onCommit={(t) => commit(["header", "name"], t)}
              className={cn("block", look.name)}
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
            <section className={gap}>
              <SectionTitle className={look.title}>Summary</SectionTitle>
              <Editable as="p" label="Summary" value={resume.summary} onCommit={(t) => commit(["summary"], t)} className="mt-1 block" />
            </section>
          )}

          {resume.roles.length > 0 && (
            <section className={gap}>
              <SectionTitle className={look.title}>Experience</SectionTitle>
              <div className={cn("mt-1 flex flex-col", dense ? "gap-2" : "gap-3")}>
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
            <section className={gap}>
              <SectionTitle className={look.title}>Projects</SectionTitle>
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
            <section className={gap}>
              <SectionTitle className={look.title}>Skills</SectionTitle>
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
            <section className={gap}>
              <SectionTitle className={look.title}>Education</SectionTitle>
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
            <section className={gap}>
              <SectionTitle className={look.title}>Certifications</SectionTitle>
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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void downloadWord()} disabled={wordBusy} className="gap-2">
              {wordBusy ? <WorklyLoader className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Word
            </Button>
            <Button variant="outline" onClick={copyText} className="gap-2">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy text"}
            </Button>
          </div>
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
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Look</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                pages === 1 ? "text-success" : "text-warning",
              )}
              aria-live="polite"
            >
              <span className={cn("size-1.5 rounded-full", pages === 1 ? "bg-success" : "bg-warning")} aria-hidden />
              {pages === 1 ? "Fits on one page" : `About ${pages} pages`}
            </span>
          </div>
          <div role="radiogroup" aria-label="Layout" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {RESUME_LAYOUTS.map((l) => {
              const selected = style.layout === l.key;
              return (
                <button
                  key={l.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => changeStyle({ ...style, layout: l.key })}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
            Compact spacing
            <Switch checked={dense} onCheckedChange={(on) => changeStyle({ ...style, density: on ? "compact" : "comfortable" })} />
          </label>
          {pages > 1 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {dense ? "Clear a line or two that doesn't help for this job." : "Try compact spacing, or clear a line you don't need."} Two
              pages is fine with 10+ years of experience.
            </p>
          )}
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
