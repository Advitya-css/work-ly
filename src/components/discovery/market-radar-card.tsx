import Link from "next/link";
import { Radar } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MarketRadar, RadarStatus } from "@/lib/discovery/market-radar";
import { RADAR_MIN_POSTINGS } from "@/lib/discovery/market-radar";
import { cn } from "@/lib/utils";

const STATUS: Record<RadarStatus, { label: string; variant: "success" | "warning" | "outline"; bar: string }> = {
  shown: { label: "You show it", variant: "success", bar: "bg-success" },
  listed: { label: "Listed only", variant: "warning", bar: "bg-warning" },
  missing: { label: "Missing", variant: "outline", bar: "bg-muted-foreground/40" },
};

/**
 * Counts, not guesses: every percentage here is "N of the postings Work-ly
 * found for you list this". See lib/discovery/market-radar.ts.
 */
export function MarketRadarCard({ radar, targetRole }: { radar: MarketRadar; targetRole: string | null }) {
  if (radar.sampleSize < RADAR_MIN_POSTINGS || radar.items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 px-5 py-4">
          <Radar className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Market radar</span> shows which skills employers for{" "}
            {targetRole ? <span className="font-medium text-foreground">{targetRole}</span> : "your target role"} ask for
            most, counted from real postings. It needs at least {RADAR_MIN_POSTINGS} recent matching postings; run
            Discover to build it up{radar.sampleSize > 0 ? ` (${radar.sampleSize} so far)` : ""}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const missing = radar.items.slice(0, 10).filter((i) => i.status === "missing").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="size-5 text-primary" />
          What employers are asking for
        </CardTitle>
        <CardDescription>
          From {radar.sampleSize} {targetRole ? `${targetRole} ` : ""}postings Work-ly found in the last {radar.sinceDays}{" "}
          days. Of the 10 most-asked-for skills, you show {radar.shownInTop10} in real work
          {radar.listedInTop10 > 0 ? `, only list ${radar.listedInTop10}` : ""}
          {missing > 0 ? `, and are missing ${missing}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2.5">
          {radar.items.map((item) => {
            const status = STATUS[item.status];
            const pct = Math.round(item.share * 100);
            return (
              <li key={item.skill} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
                <span className="truncate text-sm text-foreground" title={item.skill}>
                  {item.skill}
                </span>
                <div className="order-3 col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className={cn("h-full rounded-full", status.bar)} style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {pct}% · {item.count}
                  </span>
                </div>
                <Badge variant={status.variant} className="justify-self-end whitespace-nowrap">
                  {status.label}
                </Badge>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          &ldquo;Listed only&rdquo; means it&apos;s in your skills list but not shown in a role or project, which
          screeners often discount.{" "}
          <Link href="/career-profile" className="text-primary underline-offset-2 hover:underline">
            Update your profile
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
