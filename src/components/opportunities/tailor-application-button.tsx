"use client";

import { useState } from "react";
import { AlertTriangle, Lock, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateTailoredApplicationAction } from "@/lib/opportunities/actions";
import type { TailoredApplication } from "@/lib/ai/providers/tailor-ai";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { CopyButton, ToolDialog } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";

/** The cover letter for one job: written once from your profile, then yours to edit. */
export function TailorApplicationButton({
  opportunityId,
  isPro = false,
  preview,
  label,
  lockedLabel,
}: {
  opportunityId: string;
  isPro?: boolean;
  preview?: PreviewData;
  /** Button text override, e.g. a shorter label inside a tool tile. */
  label?: string;
  lockedLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const tool = useSavedTool<TailoredApplication>("cover", opportunityId, async () => {
    const res = await generateTailoredApplicationAction(opportunityId);
    return { data: res.data, savedAt: res.savedAt, error: res.error };
  });

  if (!isPro) {
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
        actions={<CopyButton text={letter} label="Copy letter" />}
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
