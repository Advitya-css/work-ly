"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * A progress bar announces itself to a screen reader as "progressbar, 62%",
 * which is useless without saying what is 62% complete. `label` is required
 * so a bar can never ship unnamed - the previous version was silent on both
 * the dashboard and the career profile page.
 */
function Progress({
  className,
  value,
  label,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { label: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={label}
      aria-valuenow={value ?? 0}
      aria-valuetext={`${Math.round(value ?? 0)}%`}
      className={cn("bg-muted relative h-1.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
