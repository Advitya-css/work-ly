"use client";

import { useState } from "react";
import { Lock, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateInterviewPrepAction, type InterviewQuestion } from "@/lib/opportunities/pro-actions";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { CopyButton, ToolDialog } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";

type Questions = { questions: (Partial<InterviewQuestion> & { question: string; redFlag: string; greenFlag: string })[] };

function asText(data: Questions): string {
  return data.questions
    .map((q, i) =>
      [
        `${i + 1}. ${q.question}`,
        q.why ? `Why they'll ask: ${q.why}` : null,
        q.answerFrom ? `Answer from: ${q.answerFrom}` : "Answer from: prepare a real example first",
        `A strong answer: ${q.greenFlag}`,
        `Avoid: ${q.redFlag}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/**
 * The questions this hiring manager is likely to ask you, aimed at where
 * your evidence is thin, each with the line from your own history to
 * answer from.
 */
export function InterviewIntelButton({
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
  const tool = useSavedTool<Questions>("interview", opportunityId, async () => {
    const res = await generateInterviewPrepAction(opportunityId);
    return "error" in res ? { error: res.error } : { data: res.data, savedAt: res.savedAt };
  });

  if (!isPro) {
    return (
      <UpgradeModal
        title="Unlock interview questions"
        description="The questions this interviewer is likely to ask you, aimed at your thin spots, with what to answer from."
        preview={
          preview && (
            <ProPreview
              facts={[{ label: "They'd probe", items: (preview.gaps ?? []).slice(0, 3) }]}
              outputLabel="5 likely questions, with what a strong answer includes"
              lines={3}
            />
          )
        }
      >
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <Lock className="size-4" />
          {lockedLabel ?? "Likely interview questions (Pro)"}
        </Button>
      </UpgradeModal>
    );
  }

  const questions = Array.isArray(tool.data?.questions) ? tool.data.questions : [];

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
        <MessagesSquare className="size-4" />
        {label ?? "Likely interview questions"}
      </Button>

      <ToolDialog
        wide
        open={open}
        onOpenChange={setOpen}
        title="Likely interview questions"
        description="What this interviewer is likely to ask you, and what to answer from."
        phase={tool.phase}
        error={tool.error}
        steps={["Reading the job", "Finding where your evidence is thin", "Writing the questions they're likely to ask", "Matching each to your own experience"]}
        stepSeconds={8}
        edited={false}
        status={savedLabel("idle", false, tool.savedAt)}
        onRegenerate={() => void tool.regenerate()}
        actions={tool.data && <CopyButton text={asText(tool.data)} label="Copy all" />}
      >
        <ol className="flex flex-col divide-y divide-border">
          {questions.map((q, i) => (
            <li key={i} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-[15px] font-medium leading-snug text-foreground">{q.question}</p>
                  {q.why && <p className="text-sm text-muted-foreground">{q.why}</p>}
                </div>
                {q.answerFrom !== undefined && (
                  <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {q.answerFrom ? "Answer from" : "Thin spot"}
                    </span>
                    <span className="text-foreground">
                      {q.answerFrom ?? "Nothing on your profile fits yet. Prepare a real example before the interview."}
                    </span>
                  </div>
                )}
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="border-l-2 border-success/60 pl-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-success">A strong answer</dt>
                    <dd className="text-foreground/90">{q.greenFlag}</dd>
                  </div>
                  <div className="border-l-2 border-destructive/50 pl-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-destructive">Avoid</dt>
                    <dd className="text-foreground/90">{q.redFlag}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </ToolDialog>
    </>
  );
}
