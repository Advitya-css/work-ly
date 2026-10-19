import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Detail that most people don't need on first read, folded away behind its
 * title. Pages show the decision and the next step; the workings live here.
 */
export function Fold({
  title,
  hint,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  /** A few words after the title (e.g. a count). */
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-xl border border-border bg-card shadow-sm", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}

/** A plain titled panel, matching Fold's look when it doesn't need folding. */
export function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
