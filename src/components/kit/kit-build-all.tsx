"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { generateTailoredResumeDocAction } from "@/lib/resume/actions";
import { generateTailoredApplicationAction } from "@/lib/opportunities/actions";
import { generateInterviewPrepAction, generateOutreachEmailAction } from "@/lib/opportunities/pro-actions";
import { KIT_LABEL, type KitItem } from "@/lib/kit/kit-items";

type State = "waiting" | "writing" | "done" | "failed";

const RUN: Record<KitItem, (id: string) => Promise<{ error?: string } | object>> = {
  resume: (id) => generateTailoredResumeDocAction(id),
  cover: (id) => generateTailoredApplicationAction(id),
  note: (id) => generateOutreachEmailAction(id),
  interview: (id) => generateInterviewPrepAction(id),
};

/**
 * Writes every missing document of the kit at once, side by side, and
 * shows each one landing. About as long as the slowest one, not the sum.
 */
export function KitBuildAll({ opportunityId, missing }: { opportunityId: string; missing: KitItem[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Partial<Record<KitItem, State>>>({});
  const running = Object.values(states).some((s) => s === "writing");
  const started = Object.keys(states).length > 0;

  async function build(kinds: KitItem[]) {
    setStates((s) => ({ ...s, ...Object.fromEntries(kinds.map((k) => [k, "writing"])) }));
    await Promise.all(
      kinds.map(async (kind) => {
        try {
          const res = await RUN[kind](opportunityId);
          const failed = "error" in res && Boolean(res.error);
          setStates((s) => ({ ...s, [kind]: failed ? "failed" : "done" }));
        } catch {
          setStates((s) => ({ ...s, [kind]: "failed" }));
        }
      }),
    );
    router.refresh();
  }

  if (missing.length === 0) return null;

  if (!started) {
    return (
      <Button onClick={() => void build(missing)} className="gap-2">
        <Sparkles className="size-4" />
        {missing.length === 4 ? "Write my whole kit" : `Write the other ${missing.length}`}
      </Button>
    );
  }

  return (
    <ul role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
      {missing.map((kind) => {
        const s = states[kind] ?? "waiting";
        return (
          <li key={kind} className="inline-flex items-center gap-1.5">
            {s === "writing" ? (
              <WorklyLoader className="size-3.5 animate-spin text-primary" />
            ) : s === "done" ? (
              <Check className="size-3.5 text-success" aria-hidden />
            ) : (
              <AlertCircle className="size-3.5 text-destructive" aria-hidden />
            )}
            <span className={s === "done" ? "text-foreground" : "text-muted-foreground"}>
              {KIT_LABEL[kind]}
              {s === "failed" ? " didn't finish" : ""}
            </span>
          </li>
        );
      })}
      {!running && Object.values(states).some((s) => s === "failed") && (
        <li>
          <button
            type="button"
            onClick={() => void build(missing.filter((k) => states[k] === "failed"))}
            className="font-medium text-foreground underline-offset-4 hover:underline">
            Try again
          </button>
        </li>
      )}
    </ul>
  );
}
