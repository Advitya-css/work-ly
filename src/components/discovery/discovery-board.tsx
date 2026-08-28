"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { runDiscoveryAction, dismissDiscoveredJobAction, trackDiscoveredJobAction } from "@/lib/discovery/actions";
import { BUCKETS, SOURCE_KIND_LABEL } from "@/lib/discovery/labels";
import { searchJobs, type SearchContext } from "@/lib/search/engine";
import { formatSalaryRange } from "@/lib/format";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { comparePriority } from "@/lib/discovery/sort";
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
  // What Explore mode actually issued to live sources, from the server
  // action's own report - not the separate, uncapped, client-only
  // expansion below (which explains locally-stored search results, not
  // what got queried against the internet). Kept distinct on purpose so
  // this line can never claim more than what really happened.
  const [lastSearchTermsUsed, setLastSearchTermsUsed] = useState<string[] | null>(null);
  const [sort, setSort] = useState<"priority" | "fit" | "recent">("priority");
  const [mode, setMode] = useState<"BALANCED" | "STRICT_SKILLS" | "EXPLORE">("BALANCED");
  const [searchMode, setSearchMode] = useState<"search" | "explore">("search");
  const [matchValues, setMatchValues] = useState(false);

  // A bucket filter selected in one mode (e.g. "Strong" while browsing
  // Standard Search results) used to silently stay applied after switching
  // to Brainstorm/Explore and typing a new query - the results count above
  // the list would report the real total (e.g. "4 matching opportunities"),
  // while the list itself, still filtered to a bucket that happens to have
  // zero matches under the new query, showed "No listings match this
  // search" right below it. Same query, two contradictory answers on one
  // screen. Clearing the filter on every mode switch keeps a filter chip
  // selected only for the search that was showing when it was clicked.
  useEffect(() => {
    setActiveBucket(null);
  }, [searchMode]);

  const searchResult = useMemo(
    () => searchJobs({ jobs, query, context, limit: 200, mode, matchValues }),
    [jobs, query, context, mode],
  );

  const topPicks = useMemo(() => {
    if (query.trim() !== "") return [];
    // baseline is already sorted by the highly-tuned blended relevance score (b.score)
    const baseline = searchJobs({ jobs, query: "", context, limit: 10, mode: "BALANCED", matchValues });
    return baseline.results
      .filter(
        (r) =>
          r.job.fitScore != null &&
          // Null fitCoverage means this job was discovered before coverage
          // tracking existed (or, going forward, before the discovery run
          // that scored it could measure enough to compute one) - treat it
          // the same way DiscoveredJob.fitCoverage's own doc comment and
          // every other coverage-gated display in this codebase do: unknown
          // is not the same as zero, so it doesn't get excluded. Coercing
          // it to 0 here silently hid every job that predated the coverage
          // column - in practice, on a real account, most or all of them -
          // which is why Top Picks could come up empty even with plenty of
          // good matches sitting right there.
          (r.job.fitCoverage == null || r.job.fitCoverage >= 0.5) &&
          r.score >= 0.65 && // Ironclad floor: must be highly relevant
          // A job Workly itself has bucketed Low Priority or Skip has no
          // business calling itself a "Top Pick" even if its blended
          // relevance score alone happens to clear the floor above - that
          // was exactly the "top match is actually a Low Priority job"
          // contradiction found on the bucket-count sort (see
          // lib/discovery/sort.ts). Recommendation, not raw relevance, is
          // the more authoritative signal here.
          r.job.recommendation !== "LOW_PRIORITY" &&
          r.job.recommendation !== "SKIP",
      )
      .sort(comparePriority)
      .slice(0, 3);
  }, [jobs, query, context]);

  const visible = useMemo(() => {
    let filtered = searchResult.results;
    
    // UI Guard: Never show explicitly rejected/irrelevant jobs in the default feed.
    // If the user wants to see them, they must explicitly click the "Low Priority" bucket filter.
    if (activeBucket) {
      filtered = filtered.filter((result) => {
        const recommendation = result.job.recommendation;
        if (activeBucket === "applyNow") return recommendation === "APPLY_NOW";
        if (activeBucket === "strong") return recommendation === "APPLY";
        if (activeBucket === "stretch") return recommendation === "STRETCH";
        return recommendation === "LOW_PRIORITY" || recommendation === "SKIP";
      });
    } else if (query.trim() === "") {
      // No bucket selected and no query typed: they are just looking at the default feed.
      // Hide explicitly rejected jobs. Showing them here makes the user think the AI recommended them!
      filtered = filtered.filter((result) => {
         const rec = result.job.recommendation;
         return rec === "APPLY_NOW" || rec === "APPLY" || rec === "STRETCH";
      });
    }

    return [...filtered].sort((a, b) => {
      if (sort === "priority") {
        return comparePriority(a, b);
      }
      if (sort === "fit") {
        return (b.job.fitScore ?? 0) - (a.job.fitScore ?? 0);
      }
      if (sort === "recent") {
        const dateB = b.job.postedAt ? new Date(b.job.postedAt).getTime() : new Date(b.job.discoveredAt).getTime();
        const dateA = a.job.postedAt ? new Date(a.job.postedAt).getTime() : new Date(a.job.discoveredAt).getTime();
        return dateB - dateA;
      }
      return 0;
    });
  }, [searchResult.results, activeBucket, sort]);

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

  const [upgradeRequired, setUpgradeRequired] = useState(false);

  function discover() {
    setMessage(null);
    setUpgradeRequired(false);
    setLastSearchTermsUsed(null);
    startTransition(async () => {
      const result = await runDiscoveryAction(query || undefined, { expandSearch: searchMode === "explore" });
      if (result.upgradeRequired) {
        setUpgradeRequired(true);
      } else {
        setMessage(
          result.error
            ? result.error
            : result.found === 0
              ? "No new listings. Anything found was either already saved, or hidden by your location filters."
              : `Discovered ${result.found} new listing${result.found === 1 ? "" : "s"}.`,
        );
        // Only worth showing once there's more than the literal query to
        // report - a plain Standard Search run also returns searchTermsUsed
        // (just the one literal term), which isn't worth a line of its own.
        if (result.searchTermsUsed && result.searchTermsUsed.length > 1) {
          setLastSearchTermsUsed(result.searchTermsUsed);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 border-b border-border pb-1">
          <button 
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${searchMode === "search" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setSearchMode("search"); setMode("BALANCED"); }}
          >
            Standard Search
          </button>
          <button 
            className={`text-sm font-medium pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${searchMode === "explore" ? "border-purple-500 text-purple-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setSearchMode("explore"); setMode("EXPLORE"); }}
          >
            <Sparkles className="size-3.5" /> Brainstorm / Explore
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <div className="relative min-w-[260px] flex-1">
            <Search className={`absolute left-3 top-1/2 size-4 -translate-y-1/2 ${searchMode === "explore" ? "text-purple-500" : "text-muted-foreground"}`} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchMode === "explore" ? "Brainstorm roles, industries, or interests... (e.g., 'climate tech data')" : "Filter by title, company, or keyword..."}
              className={`pl-9 ${searchMode === "explore" ? "border-purple-500/30 focus-visible:ring-purple-500/30 shadow-sm" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  discover();
                }
              }}
            />
          </div>
          <Button type="button" onClick={discover} disabled={pending} className={searchMode === "explore" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}>
            {pending ? <Loader2 className="animate-spin" /> : (searchMode === "explore" ? <Sparkles className="size-4" /> : <Radar />)}
            {pending ? "Discovering…" : (searchMode === "explore" ? "Explore" : "Discover")}
          </Button>
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background shadow-sm">
            <input 
              type="checkbox" 
              id="matchValuesToggle"
              checked={matchValues} 
              onChange={(e) => setMatchValues(e.target.checked)} 
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="matchValuesToggle" className="text-sm font-medium cursor-pointer select-none">
              Match my Values
            </label>
            <div className="group relative flex items-center justify-center">
              <Info className="size-4 text-muted-foreground" />
              <div className="absolute bottom-full mb-2 hidden w-64 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block z-50">
                Turn this on to cross-reference jobs with your extracted core values (e.g., sustainability, fast-paced). Aligned jobs get a +15% fit boost.
              </div>
            </div>
          </div>
          <AddFeedForm />
        </div>
      </div>
      
      {message && (
        <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2">
          {message}
        </p>
      )}

      {/* What Explore mode actually sent to live sources this run - a
          direct report of real server-side behavior, not the separate
          client-side expansion below (which explains why already-known
          results match, and can legitimately list more titles than were
          ever queried live). */}
      {lastSearchTermsUsed && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>
            <span className="font-medium text-purple-600">✨ AI Thought Translation: </span> Based on your interest, we scraped the web for: 
            {lastSearchTermsUsed.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {upgradeRequired && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">Daily discovery limit reached.</span>{" "}
            You&apos;ve used your 3 free AI discoveries for today — it resets in 24 hours. Upgrading
            removes the daily cap.
          </AlertDescription>
        </Alert>
      )}


      {/* Hidden role discovery: why already-known results below also count
          as a match for this query. This is a LOCAL relevance signal over
          jobs already in your feed, computed instantly in the browser - it
          is not a report of what got searched live (see "Searched live
          for" above, shown only after an Explore run). It can legitimately
          list more titles than a live search ever used. */}
      {searchResult.expansion.expandedRoles.length > 0 && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">
              Also matching related roles:{" "}
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
          {searchResult.results.length === 1 ? "y" : "ies"} discovered. Organized so you don&apos;t
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
        <div className="mt-2 flex items-center justify-between">
          {activeBucket ? (
            <button
              type="button"
              onClick={() => setActiveBucket(null)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Show all bands
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Top Matches (For You)</SelectItem>
                <SelectItem value="fit">Candidate Fit</SelectItem>
                <SelectItem value="recent">Recently Found</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      {topPicks.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Top Picks For You</h3>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            {topPicks.map((result) => (
              <DiscoveryCard
                key={"top-" + result.job.id}
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
                isTopPick={true}
              />
            ))}
          </div>
          <div className="h-px bg-border my-2" />
        </div>
      )}
      
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
              mode={mode}
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
  mode,
  isTopPick,
}: {
  job: DiscoveredJob;
  reasons: string[];
  viaExpansion: { role: string; rationale: string } | null;
  onDismiss: () => void;
  onTrack: () => void;
  pending: boolean;
  mode?: string;
  isTopPick?: boolean;
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {bucket && (
                <bucket.icon className={cn("size-4 shrink-0", bucket.tone)} aria-label={bucket.label} />
              )}
              <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">{job.title}</p>
              {job.fitScore != null &&
                // fitCoverage is null for rows scored before this field
                // existed - fall back to showing the score rather than
                // hiding every pre-existing listing's badge. A real
                // coverage value below the threshold means Workly couldn't
                // actually assess this listing, so don't show a number
                // that looks like a measurement.
                (job.fitCoverage == null || job.fitCoverage >= MIN_COVERAGE_FOR_SCORE) && (
                  <Badge variant="outline">Fit {job.fitScore}/100</Badge>
                )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
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
          <span className="truncate max-w-[200px] sm:max-w-none">
            Source: <span className="text-foreground">{job.sourceName}</span>{" "}
            <Badge variant="secondary" className="whitespace-nowrap">{SOURCE_KIND_LABEL[job.sourceKind]}</Badge>
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

import { AddFeedForm } from "@/components/discovery/add-feed-form";

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
          Active data sources powering your discovery feed.
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
              
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
