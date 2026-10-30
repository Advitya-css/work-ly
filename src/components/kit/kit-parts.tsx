import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The building blocks every page of the application kit shares: a document
 * in the middle and an inspector beside it, like a design tool. Server-safe.
 */

export function Studio({ document, inspector }: { document: ReactNode; inspector: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">{document}</div>
      <aside className="flex flex-col gap-3 lg:sticky lg:top-6">{inspector}</aside>
    </div>
  );
}

export function InspectorSection({
  title,
  aside,
  children,
  className,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs", className)}>
      {(title || aside) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** A small uppercase label in the mono face. */
export function KitLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}

/** A segmented control: a row of options, one chosen. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { key: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          title={o.hint}
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-7 rounded-md px-2 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
            value === o.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
