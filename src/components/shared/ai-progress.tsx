"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { cn } from "@/lib/utils";

/**
 * What the AI is doing while you wait. Most tools take 20-60 seconds; a
 * bare spinner for that long reads as broken. The steps are what the tool
 * really does, in order - their timing is an estimate, so the last step
 * simply stays active until the answer arrives.
 */
export function AiProgress({
  steps,
  stepSeconds = 8,
  note,
  className,
}: {
  steps: string[];
  /** Roughly how long each step takes. */
  stepSeconds?: number;
  /** A line under the steps, e.g. "Usually 30-60 seconds." */
  note?: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const timer = setInterval(() => {
      setActive((i) => Math.min(i + 1, steps.length - 1));
    }, stepSeconds * 1000);
    return () => clearInterval(timer);
  }, [steps.length, stepSeconds]);

  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-2 text-sm", className)}>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <li
            key={step}
            className={cn(
              "flex items-center gap-2 transition-colors",
              i < active ? "text-muted-foreground" : i === active ? "font-medium text-foreground" : "text-muted-foreground/50",
            )}
          >
            <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
              {i < active ? (
                <Check className="size-3.5 text-primary" />
              ) : i === active ? (
                <WorklyLoader className="size-3.5 animate-spin" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
