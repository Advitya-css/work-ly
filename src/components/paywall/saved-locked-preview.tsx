import { Lock } from "lucide-react";

/**
 * Something Work-ly already wrote for this person (during the trial, or on
 * a plan that has ended): the first words are readable, the rest is
 * blurred. It's their own work, so it's a far better reason to come back
 * than a generic preview, and nothing about it is made up.
 */
export function SavedLockedPreview({ label, visible, lines = 3 }: { label: string; visible: string; lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-5/6", "w-2/3"];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Lock className="size-3" aria-hidden />
        {label}
      </p>
      <p className="text-sm leading-relaxed text-foreground">{visible}</p>
      <div className="flex flex-col gap-2 pt-1" aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className={`h-2.5 rounded-full bg-foreground/10 blur-[1.5px] ${widths.at(i % widths.length)}`} />
        ))}
      </div>
    </div>
  );
}
