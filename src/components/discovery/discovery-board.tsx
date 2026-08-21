"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ExternalLink,
  EyeOff,
  Sparkles,
  Calendar,
  Radar,
  Info,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { runDiscoveryAction, dismissDiscoveredJobAction, trackDiscoveredJobAction } from "@/lib/discovery/actions";
import { BUCKETS, SOURCE_KIND_LABEL } from "@/lib/discovery/labels";
import { searchJobs, type SearchContext } from "@/lib/search/engine";
import { formatSalaryRange } from "@/lib/format";
import type { DiscoveredJob } from "@/lib/db/types";

/**
 * The discovery surface.
 *
 * Search and ranking run entirely in the browser over jobs already scored
 * and embedded by the discovery run - no AI call, no network request, no
 * per-keystroke analysis. That's the Phase 8 performance requirement made
 * literal.
 */
export function DiscoveryBoard({
  jobs,
  context,
}: {
  jobs: DiscoveredJob[];
  context: SearchContext;
}) {
  const [query, setQuery] = useState("");
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const searchResult = useMemo(
    () => searchJobs({ jobs, query, context, limit: 200 }),
    [jobs, query, context],
  );

  const visible = useMemo(() => {
    const results = searchResult.results;
    if (!activeBucket) return results;
    return results.filter((result) => {
      const recommendation = result.job.recommendation;
      if (activeBucket === "applyNow") return recommendation === "APPLY_NOW";
      if (activeBucket === "strong") return recommendation === "APPLY";
      if (activeBucket === "stretch") return recommendation === "STRETCH";
      return recommendation === "LOW_PRIORITY" || recommendation === "SKIP";
    });
  }, [searchResult.results, activeBucket]);

  const counts = useMemo(() => {
    const all = searchResult.results;
    const count = (predicate: (job: DiscoveredJob) => boolean) =>
      all.filter((result) => predicate(result.job)).length;
    return {
      applyNow: count((job) => job.recommendation === "APPLY_NOW"),
      strong: count((job) => job.recommendation === "APPLY"),
      stretch: count((job) => job.recommendation === "STRETCH"),
      lowPriority: count(
        (job) => job.recommendation === "LOW_PRIORITY" || job.recommendation === "SKIP",
      ),
    };
  }, [searchResult.results]);

  function discover() {
    setMessage(null);
    startTransition(async () => {
      const result = await runDiscoveryAction(query || undefined);
      setMessage(
        result.error
          ? result.error
          : result.found === 0
            ? "No new listings this time. Everything found was already in your feed."
            : `Discovered ${result.found} new listing${result.found === 1 ? "" : "s"}.`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try a field rather than a title: e.g. documentary filmmaking"
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                discover();
              }
            }}
          />
        </div>
        <Button type="button" onClick={discover} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Radar />}
          {pending ? "Discovering…" : "Discover"}
        </Button>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Hidden role discovery. Shown whenever expansion actually fired */}
      {searchResult.expansion.expandedRoles.length > 0 && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">
              Also searching related roles:{" "}
              {[...new Set(searchResult.expansion.expandedRoles.map((r) => r.role))].join(", ")}.
            </span>{" "}
            {searchResult.expansion.expandedRoles[0].rationale}
          </AlertDescription>
        </Alert>
      )}

      {/* Suppressed expansion: explains an absence, which is otherwise invisible */}
      {searchResult.expansion.expandedRoles.length === 0 &&
        searchResult.expansion.suppressed.length > 0 && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              {searchResult.expansion.suppressed[0].reason}
            </AlertDescription>
          </Alert>
        )}

      {/* Bucket summary: the whole point of the page */}
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          <span className="text-lg font-bold text-foreground">{searchResult.results.length}</span>{" "}
          {query ? "matching " : ""}opportunit
          {searchResult.results.length === 1 ? "y" : "ies"} discovered. Organised so you don&apos;t
          have to read them all.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((bucket) => {
            const count = counts[bucket.key];
            const isActive = activeBucket === bucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                onClick={() => setActiveBucket(isActive ? null : bucket.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
                  // An empty bucket is de-emphasised by draining the colour
                  // from its count, not by fading the whole control: dimming
                  // the label too pushed it below the readable contrast
                  // threshold, so the buckets with nothing in them became the
                  // hardest ones to read.
                  count === 0 && "border-dashed",
                )}
                aria-pressed={isActive}
              >
                <bucket.icon
                  className={cn("size-4", count === 0 ? "text-muted-foreground" : bucket.tone)}
                />
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    count === 0 ? "text-muted-foreground" : bucket.tone,
                  )}
                >
                  {count}
                </span>
                <span className="font-medium text-foreground">{bucket.label}</span>
              </button>
            );
          })}
        </div>
        {activeBucket && (
          <button
            type="button"
            onClick={() => setActiveBucket(null)}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-2"
          >
            Show all bands
          </button>
        )}
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {jobs.length === 0
                ? "Nothing discovered yet. Press Discover to run your sources."
                : "No listings match this search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((result) => (
            <DiscoveryCard
              key={result.job.id}
              job={result.job}
              reasons={result.reasons}
              viaExpansion={result.viaExpansion}
              onDismiss={() => startTransition(() => dismissDiscoveredJobAction(result.job.id))}
              onTrack={() =>
                startTransition(async () => {
                  const outcome = await trackDiscoveredJobAction(result.job.id);
                  setMessage(outcome.error ?? "Added to your opportunities.");
                })
              }
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscoveryCard({
  job,
  reasons,
  viaExpansion,
  onDismiss,
  onTrack,
  pending,
}: {
  job: DiscoveredJob;
  reasons: string[];
  viaExpansion: { role: string; rationale: string } | null;
  onDismiss: () => void;
  onTrack: () => void;
  pending: boolean;
}) {
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const bucket = BUCKETS.find((b) =>
    b.key === "applyNow"
      ? job.recommendation === "APPLY_NOW"
      : b.key === "strong"
        ? job.recommendation === "APPLY"
        : b.key === "stretch"
          ? job.recommendation === "STRETCH"
          : job.recommendation === "LOW_PRIORITY" || job.recommendation === "SKIP",
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {bucket && (
                <bucket.icon className={cn("size-4 shrink-0", bucket.tone)} aria-label={bucket.label} />
              )}
              <p className="text-sm font-semibold text-foreground">{job.title}</p>
              {job.fitScore != null && <Badge variant="outline">Fit {job.fitScore}/100</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {[job.company, job.location, job.country].filter(Boolean).join(" · ") || "-"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
            {job.workMode && <Badge variant="outline">{job.workMode}</Badge>}
            {salary && <Badge variant="outline">{salary}</Badge>}
          </div>
        </div>

        {/* Why we found it. Spec requirement #10 */}
        {job.discoveryReason && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why we found it:</span>{" "}
            {job.discoveryReason}
          </p>
        )}

        {viaExpansion && (
          <p className="flex items-start gap-1.5 text-xs text-primary">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            Unusual find: surfaced as <span className="font-medium">{viaExpansion.role}</span>, which
            you didn&apos;t search for directly.
          </p>
        )}

        {reasons.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {reasons.map((reason, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                · {reason}
              </li>
            ))}
          </ul>
        )}

        {/* Trust: source, link, and both dates, always */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>
            Source: <span className="text-foreground">{job.sourceName}</span>{" "}
            <Badge variant="secondary">{SOURCE_KIND_LABEL[job.sourceKind]}</Badge>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            Discovered {new Date(job.discoveredAt).toLocaleDateString()}
          </span>
          {job.postedAt && <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1 text-primary underline underline-offset-2"
            >
              <ExternalLink className="size-3" />
              View original
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.convertedOpportunityId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/opportunities/${job.convertedOpportunityId}`}>View opportunity</Link>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onTrack} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Analyze &amp; track
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onDismiss}
            disabled={pending}
          >
            <EyeOff />
            Not relevant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscoverySourcesCard({
  sources,
}: {
  sources: { id: string; name: string; kind: string; status: string; legalBasis: string; lastRunFoundCount: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where these come from</CardTitle>
        <CardDescription>
          Workly only ingests from sources that permit it. Published APIs, employer feeds, public-sector
          listings, and anything you paste yourself. It does not scrape sites that prohibit automated access.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources configured yet.</p>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{source.name}</span>
                <Badge variant="outline">{source.kind}</Badge>
                <Badge variant="secondary">{source.status}</Badge>
                {source.lastRunFoundCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {source.lastRunFoundCount} last run
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{source.legalBasis}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
