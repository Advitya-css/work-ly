import type { ReactNode } from "react";

/**
 * A kit page for a free account: what this document is, and the button
 * that opens the upgrade (or the saved copy, locked).
 */
export function KitLocked({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className="feature-panel flex flex-col items-start gap-4 p-6 sm:p-8">
      <div className="flex max-w-xl flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {children}
    </section>
  );
}
