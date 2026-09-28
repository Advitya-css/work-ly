import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { PAID_PLANS } from "@/lib/pricing";
import { saleLine, type PublicSale } from "@/lib/payments/sale-core";

/**
 * The live sale in one line (sale-core.ts). Renders nothing without one, so
 * pages can include it unconditionally; it disappears by itself when the
 * sale ends.
 */
export function SaleBanner({
  sale,
  href = "/pricing",
  className,
}: {
  sale: PublicSale | null;
  href?: string | null;
  className?: string;
}) {
  const plan = sale ? PAID_PLANS.find((p) => p.interval === sale.plan) : null;
  if (!sale || !plan) return null;
  const body = (
    <>
      <span className="min-w-0 text-balance">
        <Tag className="mr-1.5 -mt-0.5 inline size-4 align-middle text-primary" aria-hidden />
        {saleLine(sale, plan)}
      </span>
      {href && (
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
          See it
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      )}
    </>
  );
  const classes = cn(
    "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border sm:rounded-full border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm text-foreground",
    className,
  );
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-primary/70")}>
      {body}
    </Link>
  ) : (
    <p className={classes}>{body}</p>
  );
}
