"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Download, FileText, Quote, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateTailoredApplicationAction } from "@/lib/opportunities/actions";
import type { TailoredApplication } from "@/lib/ai/providers/tailor-ai";
import { LETTER_TONES, type LetterLength, type LetterTone } from "@/lib/ai/letter-options";
import { checkLetter } from "@/lib/kit/letter-checks";
import { letterElement, printElement, saveBlob, todayLong } from "@/lib/print-document";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";
import { InspectorSection, Segmented, Studio } from "@/components/kit/kit-parts";
import { WritingError, WritingState } from "@/components/kit/writing-state";
import { cn } from "@/lib/utils";

const LENGTHS: { key: LetterLength; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "standard", label: "Standard" },
];

/**
 * The cover letter on a real page: edit it in place, pick the tone and
 * length, see what it's built on and a five-second hiring-manager read.
 */
export function LetterStudio({
  opportunityId,
  sender,
  company,
}: {
  opportunityId: string;
  sender: { name: string; contact: string };
  company: string | null;
}) {
  const router = useRouter();
  const [tone, setTone] = useState<LetterTone>("direct");
  const [length, setLength] = useState<LetterLength>("standard");
  const [confirming, setConfirming] = useState(false);
  const tool = useSavedTool<TailoredApplication>("cover", opportunityId, async () => {
    const res = await generateTailoredApplicationAction(opportunityId, { tone, length });
    if (!res.error) router.refresh();
    return { data: res.data, savedAt: res.savedAt, error: res.error };
  });

  useEffect(() => {
    void tool.open();
    // Open once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The saved letter's own settings become the starting choice.
  const writtenTone = tool.data?.tone ?? "direct";
  const writtenLength = tool.data?.length ?? "standard";
  const [synced, setSynced] = useState(false);
  if (tool.data && !synced) {
    setSynced(true);
    setTone(writtenTone);
    setLength(writtenLength);
  }

  if (tool.phase === "idle" || tool.phase === "checking" || tool.phase === "generating") {
    return (
      <WritingState
        steps={["Reading the job", "Picking your two strongest proofs for it", "Writing the first draft", "Reading it as the hiring manager would", "Rewriting what didn't land", "Checking every number against your profile"]}
      />
    );
  }
  if (tool.phase === "error" || !tool.data) {
    return <WritingError message={tool.error ?? "Couldn't write the letter just now."} onRetry={() => void tool.regenerate()} />;
  }

  const letter = tool.data.coverLetter ?? "";
  const numbers = tool.data.unverifiedNumbers ?? [];
  const proofs = tool.data.proofs ?? [];
  const checks = checkLetter(letter, { maxWords: length === "short" ? 170 : 260, unverified: numbers });
  const changedSettings = tone !== writtenTone || length !== writtenLength;
  const fileName = `${sender.name || "Cover letter"} - cover letter${company ? ` - ${company}` : ""}`;

  return (
    <Studio
      document={
        <article className="paper-sheet mx-auto flex w-full max-w-[720px] flex-col px-8 py-10 sm:px-14 sm:py-14">
          <header className="flex flex-col gap-0.5 border-b border-[#ece9ef] pb-5">
            <span className="text-[17px] font-semibold tracking-[-0.01em]">{sender.name || "Your name"}</span>
            {sender.contact && <span className="text-[12.5px] text-[#6b6570]">{sender.contact}</span>}
          </header>
          <p className="mt-5 text-[12.5px] text-[#6b6570]">{todayLong()}</p>
          <textarea
            aria-label="Cover letter"
            value={letter}
            spellCheck
            onChange={(e) => tool.edit({ coverLetter: e.target.value })}
            className="mt-5 min-h-[420px] w-full resize-none bg-transparent text-[15px] leading-[1.75] text-[#17141a] outline-none [field-sizing:content] focus-visible:outline-none"
          />
        </article>
      }
      inspector={
        <>
          <InspectorSection>
            <Button className="gap-2" onClick={() => printElement(letterElement(letter, sender, todayLong()), fileName)}>
              <Download className="size-4" />
              Download PDF
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const { buildLetterDocx } = await import("@/lib/resume/docx");
                  saveBlob(await buildLetterDocx(letter, sender, todayLong()), `${fileName}.docx`);
                }}
              >
                <FileText className="size-4" />
                Word
              </Button>
              <CopyButton text={letter} label="Copy" variant="outline" />
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {savedLabel(tool.saveState, tool.edited, tool.savedAt) || "Click the letter to edit it."}
            </p>
          </InspectorSection>

          <InspectorSection title="Tone and length">
            <Segmented label="Tone" value={tone} options={LETTER_TONES} onChange={setTone} />
            <p className="-mt-1 text-xs text-muted-foreground">{LETTER_TONES.find((t) => t.key === tone)?.hint}</p>
            <Segmented label="Length" value={length} options={LENGTHS} onChange={setLength} />
            {confirming ? (
              <div className="flex flex-col gap-2 text-[13px]">
                <span className="text-foreground">{tool.edited ? "This replaces your edits. Rewrite?" : "Write a new version?"}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setConfirming(false);
                      setSynced(true);
                      void tool.regenerate();
                    }}
                  >
                    Yes, rewrite
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant={changedSettings ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setConfirming(true)}>
                <RefreshCw className="size-3.5" />
                {changedSettings ? "Rewrite with these" : "Write a new version"}
              </Button>
            )}
          </InspectorSection>

          <InspectorSection title="Hiring-manager read">
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-2 text-[12.5px] leading-snug">
                  {c.ok ? (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  )}
                  <span className="flex flex-col">
                    <span className={cn(c.ok ? "text-foreground" : "font-medium text-foreground")}>{c.label}</span>
                    {!c.ok && c.fix && <span className="text-muted-foreground">{c.fix}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </InspectorSection>

          {(tool.data.revisions?.length ?? 0) > 0 && (
            <InspectorSection title="Fixed on a second read">
              <p className="text-xs leading-relaxed text-muted-foreground">
                The first draft was read as this hiring manager would, then rewritten to fix:
              </p>
              <ul className="flex flex-col gap-1.5">
                {tool.data.revisions!.map((r) => (
                  <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </InspectorSection>
          )}

          {proofs.length > 0 && (
            <InspectorSection title="Built on these lines of yours">
              <ul className="flex flex-col gap-2.5">
                {proofs.map((p) => (
                  <li key={p} className="flex gap-2 text-[12.5px] leading-snug text-muted-foreground">
                    <Quote className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </InspectorSection>
          )}
        </>
      }
    />
  );
}
