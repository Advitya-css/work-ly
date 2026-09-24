import type { ReactNode } from "react";
import { Eye } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PreviewFact {
  label: string;
  items: string[];
}

/**
 * What a locked Pro tool would produce, shown before the upgrade button.
 *
 * Only the INPUTS are shown in the clear - the user's own roles, this job's
 * real keywords, the gaps Work-ly actually found - because those are true
 * and specific to them, which is what makes the value obvious. The output
 * itself is blurred placeholder bars, never invented sample text: a fake
 * "tailored bullet" would be a claim about their experience Work-ly hasn't
 * made.
 */
export function ProPreview({
  heading = "What you'd get for this job",
  intro,
  facts,
  outputLabel,
  lines = 4,
  className,
  children,
}: {
  heading?: string;
  intro?: string;
  facts: PreviewFact[];
  outputLabel: string;
  lines?: number;
  className?: string;
  /** The unlock button. */
  children?: ReactNode;
}) {
  const shown = facts.filter((f) => f.items.length > 0);
  const widths = ["w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];

  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <Eye className="size-3.5" aria-hidden />
        {heading}
      </div>

      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}

      {shown.length > 0 && (
        <dl className="flex flex-col gap-3">
          {shown.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1.5">
              <dt className="text-xs font-medium text-muted-foreground">{fact.label}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {fact.items.map((item) => (
                  <span
                    key={item}
                    className="max-w-full truncate rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">{outputLabel}</p>
        <div className="relative select-none" aria-hidden>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 blur-[1.5px]">
            {Array.from({ length: lines }, (_, i) => (
              <div key={i} className={cn("h-2.5 rounded-full bg-muted-foreground/20", widths[i % widths.length])} />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 rounded-b-md bg-gradient-to-t from-card to-transparent" />
        </div>
        <span className="sr-only">The generated result is available with Work-ly Pro.</span>
      </div>

      {children}
    </div>
  );
}

/** The old product name under a tool's plain-language title. */
export function ToolBrand({ children }: { children: ReactNode }) {
  return <span className="text-xs font-normal text-muted-foreground">{children}</span>;
}
