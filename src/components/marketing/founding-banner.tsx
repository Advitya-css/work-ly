import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";

/**
 * The founding-member offer, in one line. Renders nothing without a live
 * offer, so pages can include it unconditionally.
 */
export function FoundingBanner({
  offer,
  href = "/pricing",
  cta = "See founding prices",
  className,
}: {
  offer: PublicFoundingOffer | null;
  href?: string | null;
  cta?: string;
  className?: string;
}) {
  if (!offer) return null;
  const body = (
    <>
      <span className="min-w-0 text-balance">
        <Sparkles className="mr-1.5 -mt-0.5 inline size-4 align-middle text-primary" aria-hidden />
        <span className="font-semibold text-foreground">Founding members:</span> {foundingSummary(offer, { forWhom: false })}
      </span>
      {href && (
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
          {cta}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      )}
    </>
  );
  const classes = cn(
    "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border sm:rounded-full border-primary/30 bg-primary/10 px-4 py-2 text-center text-sm text-muted-foreground",
    className,
  );
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-primary/60")}>
      {body}
    </Link>
  ) : (
    <p className={classes}>{body}</p>
  );
}
