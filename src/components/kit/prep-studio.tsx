"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, Quote, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateInterviewPrepAction, type InterviewQuestion } from "@/lib/opportunities/pro-actions";
import { setOpportunityStatusAction } from "@/lib/opportunities/actions";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";
import { InspectorSection, KitLabel, Studio } from "@/components/kit/kit-parts";
import { WritingError, WritingState } from "@/components/kit/writing-state";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { cn } from "@/lib/utils";

type Question = Partial<InterviewQuestion> & { question: string; redFlag: string; greenFlag: string };
type Questions = { questions: Question[] };

const KIND: Record<NonNullable<InterviewQuestion["kind"]>, { label: string; tone: string }> = {
  gap: { label: "Thin spot", tone: "bg-warning/12 text-warning" },
  "deep-dive": { label: "Your history", tone: "bg-primary/10 text-primary" },
  situation: { label: "On the job", tone: "bg-muted text-muted-foreground" },
};
const BEATS = ["Situation", "What you did", "Result"];

function asText(data: Questions): string {
  return data.questions
    .map((q, i) =>
      [
        `${i + 1}. ${q.question}`,
        q.why ? `Why they'll ask: ${q.why}` : null,
        q.answerFrom ? `Answer from: ${q.answerFrom}` : "Answer from: prepare a real example first",
        q.outline?.length ? q.outline.map((b, j) => `  ${BEATS[j] ?? "-"}: ${b}`).join("\n") : null,
        `A strong answer: ${q.greenFlag}`,
        `Avoid: ${q.redFlag}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/**
 * Interview prep for one job: the questions this interviewer is likely to
 * ask, why, the line from your own history to answer from, the answer in
 * three beats, and a way straight into practising them out loud.
 */
export function PrepStudio({ opportunityId, applicationId }: { opportunityId: string; applicationId: string | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [filter, setFilter] = useState<"all" | NonNullable<InterviewQuestion["kind"]>>("all");
  const tool = useSavedTool<Questions>("interview", opportunityId, async () => {
    const res = await generateInterviewPrepAction(opportunityId);
    if (!("error" in res)) router.refresh();
    return "error" in res ? { error: res.error } : { data: res.data, savedAt: res.savedAt };
  });

  useEffect(() => {
    void tool.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tool.phase === "idle" || tool.phase === "checking" || tool.phase === "generating") {
    return (
      <WritingState
        paper={false}
        lines={12}
        stepSeconds={8}
        steps={["Reading the job", "Finding where your evidence is thin", "Writing the questions they're likely to ask", "Building each answer from your own history"]}
      />
    );
  }
  const questions = Array.isArray(tool.data?.questions) ? tool.data.questions : [];
  if (tool.phase === "error" || questions.length === 0) {
    return <WritingError message={tool.error ?? "Couldn't prepare the questions just now."} onRetry={() => void tool.regenerate()} />;
  }

  const kinds = Array.from(new Set(questions.map((q) => q.kind).filter((k): k is NonNullable<InterviewQuestion["kind"]> => Boolean(k))));
  const shown = filter === "all" ? questions : questions.filter((q) => q.kind === filter);
  const thin = questions.filter((q) => !q.answerFrom).length;

  async function practise(index?: number) {
    const suffix = index != null ? `?q=${index}` : "";
    if (applicationId) {
      router.push(`/applications/${applicationId}/interview${suffix}`);
      return;
    }
    setStarting(true);
    const created = await setOpportunityStatusAction(opportunityId, "PREPARING").catch(() => ({ applicationId: undefined }));
    setStarting(false);
    if (created.applicationId) router.push(`/applications/${created.applicationId}/interview${suffix}`);
  }

  return (
    <Studio
      document={
        <div className="flex flex-col gap-4">
          {kinds.length > 1 && (
            <div role="tablist" aria-label="Filter questions" className="flex flex-wrap gap-1.5">
              {(["all", ...kinds] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={filter === k}
                  onClick={() => setFilter(k)}
                  className={cn(
                    "h-7 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                    filter === k ? "border-foreground/20 bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "all" ? `All ${questions.length}` : KIND[k].label}
                </button>
              ))}
            </div>
          )}

          <ol className="stagger-children flex flex-col gap-3">
            {shown.map((q) => {
              const index = questions.indexOf(q);
              return (
                <li key={index} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  <div className="flex flex-col gap-2 px-5 pb-4 pt-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">Q{index + 1}</span>
                      {q.kind && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", KIND[q.kind].tone)}>{KIND[q.kind].label}</span>}
                    </div>
                    <p className="text-balance text-[16px] font-medium leading-snug tracking-[-0.01em] text-foreground">{q.question}</p>
                    {q.why && <p className="text-[13px] leading-relaxed text-muted-foreground">{q.why}</p>}
                  </div>

                  <div className="grid gap-px border-t border-border bg-border md:grid-cols-[1.25fr_1fr]">
                    <div className="flex flex-col gap-3 bg-card px-5 py-4">
                      <KitLabel>{q.answerFrom ? "Answer from your history" : "No line on your profile fits yet"}</KitLabel>
                      {q.answerFrom ? (
                        <p className="flex gap-2 text-[13px] leading-relaxed text-foreground">
                          <Quote className="mt-1 size-3 shrink-0 text-primary" aria-hidden />
                          {q.answerFrom}
                        </p>
                      ) : (
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          Prepare one real example before the interview. Don&apos;t borrow one you didn&apos;t do.
                        </p>
                      )}
                      {q.outline && q.outline.length === 3 && (
                        <ol className="flex flex-col gap-2 border-l border-border pl-3">
                          {q.outline.map((beat, j) => (
                            <li key={j} className="flex flex-col text-[13px] leading-snug">
                              <span className="text-[11px] font-medium text-muted-foreground">{BEATS[j]}</span>
                              <span className="text-foreground">{beat}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <dl className="flex flex-col gap-3 bg-card px-5 py-4 text-[13px] leading-relaxed">
                      <div>
                        <dt className="text-[11px] font-medium text-success">A strong answer</dt>
                        <dd className="text-foreground/90">{q.greenFlag}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium text-destructive">Avoid</dt>
                        <dd className="text-foreground/90">{q.redFlag}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex justify-end border-t border-border bg-muted/30 px-4 py-2">
                    <Button variant="ghost" size="sm" className="gap-1.5" disabled={starting} onClick={() => void practise(index)}>
                      <Mic className="size-3.5" />
                      Practise this one
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      }
      inspector={
        <>
          <InspectorSection>
            <Button className="gap-2" disabled={starting} onClick={() => void practise()}>
              {starting ? <WorklyLoader className="size-4 animate-spin" /> : <Mic className="size-4" />}
              Practise all {questions.length} out loud
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Answer by voice or typing. Each answer gets a score out of 10, what worked, what to fix and a stronger
              version built from your real experience.
              {!applicationId && " Starting adds this job to your applications as Preparing."}
            </p>
          </InspectorSection>

          <InspectorSection title="Where you stand">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
              <div className="bg-card px-2 py-2.5">
                <dd className="font-mono text-xl tabular-nums text-foreground">{questions.length - thin}</dd>
                <dt className="text-[11px] text-muted-foreground">backed by your history</dt>
              </div>
              <div className="bg-card px-2 py-2.5">
                <dd className={cn("font-mono text-xl tabular-nums", thin ? "text-warning" : "text-foreground")}>{thin}</dd>
                <dt className="text-[11px] text-muted-foreground">to prepare an example</dt>
              </div>
            </dl>
          </InspectorSection>

          <InspectorSection>
            <CopyButton text={asText({ questions })} label="Copy all as notes" variant="outline" />
            <p className="text-xs text-muted-foreground">{savedLabel("idle", false, tool.savedAt)}</p>
            {confirming ? (
              <div className="flex flex-col gap-2 text-[13px]">
                <span>Write a new set of questions?</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setConfirming(false);
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
              <Button variant="ghost" size="sm" className="w-fit gap-1.5 text-muted-foreground" onClick={() => setConfirming(true)}>
                <RefreshCw className="size-3.5" />
                New set of questions
              </Button>
            )}
          </InspectorSection>
        </>
      }
    />
  );
}
