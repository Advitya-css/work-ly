"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AiProgress } from "@/components/shared/ai-progress";

/**
 * While a kit document is being written: the page it will land on, with
 * lines sweeping in, and what the writer is doing right now beside it. A
 * blank spinner for 30 seconds reads as broken; this reads as work.
 */
export function WritingState({
  steps,
  stepSeconds = 7,
  paper = true,
  lines = 14,
}: {
  steps: string[];
  stepSeconds?: number;
  /** A white page (letters, notes) or a plain card (lists). */
  paper?: boolean;
  lines?: number;
}) {
  const widths = [92, 100, 96, 70, 0, 100, 94, 98, 88, 62, 0, 97, 90, 45];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div
        aria-hidden
        className={
          paper
            ? "paper-sheet flex min-h-[520px] flex-col gap-3 px-10 py-12 sm:px-14"
            : "flex min-h-[420px] flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-xs"
        }
      >
        {Array.from({ length: lines }, (_, i) => widths[i % widths.length]).map((w, i) =>
          w === 0 ? (
            <div key={i} className="h-3" />
          ) : (
            <div
              key={i}
              className={`shimmer h-2.5 rounded-full ${paper ? "bg-[#ece9ef]" : "bg-muted"}`}
              style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
            />
          ),
        )}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs lg:sticky lg:top-6">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Writing</span>
        <AiProgress steps={steps} stepSeconds={stepSeconds} note="Usually 20-40 seconds. Saved the moment it's done." />
      </div>
    </div>
  );
}

export function WritingError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center shadow-xs">
      <AlertCircle className="size-5 text-destructive" aria-hidden />
      <p className="max-w-sm text-sm text-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
