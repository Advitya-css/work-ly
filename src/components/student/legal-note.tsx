import { ExternalLink, Info } from "lucide-react";

import { LEGAL_DISCLAIMER, type LegalLimit } from "@/lib/student/legal-limits";

/**
 * A work-hour limit, shown with the source it came from.
 *
 * The source link is not decoration. A student is being told something that
 * could affect their visa, and the only responsible version of that is one
 * where they can click through and read the rule themselves in thirty
 * seconds. Same principle as job listings elsewhere in Workly always
 * carrying their origin.
 */
export function LegalNote({ limit }: { limit: LegalLimit }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
      <p className="flex items-start gap-2 text-sm font-medium text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        {limit.headline}
      </p>
      <p className="mt-1.5 pl-6 text-sm leading-relaxed text-muted-foreground">{limit.detail}</p>
      <p className="mt-2 pl-6 text-sm leading-relaxed text-foreground">
        <span className="font-medium">Confirm with:</span> {limit.confirmWith}
      </p>
      <a
        href={limit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 ml-6 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {limit.sourceName}
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

export function LegalDisclaimer() {
  return <p className="text-xs leading-relaxed text-muted-foreground">{LEGAL_DISCLAIMER}</p>;
}
