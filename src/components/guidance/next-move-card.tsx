import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NextMove } from "@/lib/guidance/next-move";

/**
 * The first thing on the dashboard: one action, chosen from where the user
 * actually is (see lib/guidance/next-move.ts). Deliberately a single
 * primary button - a list of five suggestions is just the old dashboard
 * again.
 */
export function NextMoveCard({ move, isPro }: { move: NextMove; isPro: boolean }) {
  const showPro = move.pro && !isPro;

  return (
    <section
      aria-labelledby="next-move-title"
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/25 bg-card text-card-foreground shadow-sm",
        "bg-gradient-to-br from-primary/[0.07] via-card to-card",
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 gap-4">
          <div
            aria-hidden
            className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex"
          >
            <Compass className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Your next move
              <span className="font-medium normal-case tracking-normal text-muted-foreground">· {move.reason}</span>
              {showPro && (
                <Badge variant="outline" className="normal-case tracking-normal">
                  Pro
                </Badge>
              )}
            </p>
            <h2 id="next-move-title" className="text-lg font-semibold leading-snug text-balance text-foreground sm:text-xl">
              {move.title}
            </h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{move.body}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={move.cta.href}>
              {move.cta.label}
              <ArrowRight />
            </Link>
          </Button>
          {move.secondary && (
            <Link
              href={move.secondary.href}
              className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:text-right"
            >
              {move.secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
