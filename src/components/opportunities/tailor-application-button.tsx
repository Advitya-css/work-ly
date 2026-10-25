"use client";

import { useState } from "react";
import { AlertTriangle, Download, FileText, Lock, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateTailoredApplicationAction } from "@/lib/opportunities/actions";
import type { TailoredApplication } from "@/lib/ai/providers/tailor-ai";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { SavedLockedPreview } from "@/components/paywall/saved-locked-preview";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { CopyButton, ToolDialog } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";
import { letterElement, printElement, saveBlob, todayLong } from "@/lib/print-document";

/** The cover letter for one job: written once from your profile, then yours to edit. */
export function TailorApplicationButton({
  opportunityId,
  isPro = false,
  preview,
  label,
  lockedLabel,
  savedPreview,
  sender,
  company,
}: {
  opportunityId: string;
  isPro?: boolean;
  preview?: PreviewData;
  /** Button text override, e.g. a shorter label inside a tool tile. */
  label?: string;
  lockedLabel?: string;
  /** First words of what was saved for this job before Pro ended, shown locked. */
  savedPreview?: string | null;
  /** Name and contact line for the top of a downloaded letter. */
  sender?: { name: string; contact: string };
  company?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const tool = useSavedTool<TailoredApplication>("cover", opportunityId, async () => {
    const res = await generateTailoredApplicationAction(opportunityId);
    return { data: res.data, savedAt: res.savedAt, error: res.error };
  });

  if (!isPro) {
    if (savedPreview) {
      return (
        <UpgradeModal
          title="Your cover letter for this job is saved"
          description="It's still in your account. Pro opens it again, lets you edit and download it, and writes one for every job you apply to."
          defaultPlan="quarterly"
          preview={<SavedLockedPreview label="Saved for this job: your cover letter" visible={savedPreview} />}
        >
          <Button variant="outline" className="w-full gap-2 sm:w-auto">
            <Lock className="size-4" />
            {lockedLabel ?? "Saved"} · saved
          </Button>
        </UpgradeModal>
      );
    }
    return (
      <UpgradeModal
        title="Unlock cover letters"
        description="A cover letter for this exact posting, built from your real experience, that you can edit and copy."
        preview={
          preview && (
            <ProPreview
              facts={[
                { label: "It would lead with", items: preview.strengths },
                { label: "What the job asks for", items: preview.keywords.slice(0, 6) },
              ]}
              outputLabel="Your cover letter for this job"
              lines={3}
            />
          )
        }
      >
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <Lock className="size-4" />
          {lockedLabel ?? "Write my cover letter (Pro)"}
        </Button>
      </UpgradeModal>
    );
  }

  const letter = tool.data?.coverLetter ?? "";
  const who = sender ?? { name: "", contact: "" };
  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  const numbers = tool.data?.unverifiedNumbers ?? [];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          void tool.open();
        }}
        className="w-full gap-2 sm:w-auto"
      >
        <PenLine className="size-4" />
        {label ?? "Write my cover letter"}
      </Button>

      <ToolDialog
        open={open}
        onOpenChange={setOpen}
        title="Cover letter"
        description="Written from your profile for this posting. Edit anything; your changes are saved."
        phase={tool.phase}
        error={tool.error}
        steps={["Reading the job", "Picking your two strongest proofs for it", "Writing the letter", "Checking every number against your profile"]}
        edited={tool.edited}
        status={savedLabel(tool.saveState, tool.edited, tool.savedAt)}
        onRegenerate={() => void tool.regenerate()}
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const { buildLetterDocx } = await import("@/lib/resume/docx");
                const blob = await buildLetterDocx(letter, who, todayLong());
                saveBlob(blob, `${who.name || "Cover letter"} - cover letter${company ? ` - ${company}` : ""}.docx`);
              }}
            >
              <FileText className="size-4" />
              Word
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => printElement(letterElement(letter, who, todayLong()), `${who.name || "Cover letter"} - cover letter${company ? ` - ${company}` : ""}`)}
            >
              <Download className="size-4" />
              PDF
            </Button>
            <CopyButton text={letter} label="Copy letter" />
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {numbers.length > 0 && (
            <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                Check <span className="font-medium">{numbers.join(", ")}</span> before sending. They aren&apos;t on your
                profile, so keep them only if they&apos;re true.
              </span>
            </p>
          )}
          <Textarea
            aria-label="Cover letter"
            value={letter}
            onChange={(e) => tool.edit({ coverLetter: e.target.value })}
            className="min-h-[360px] resize-none border-border bg-background px-5 py-4 text-[15px] leading-7 shadow-none"
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">{words} words</p>
        </div>
      </ToolDialog>
    </>
  );
}
