"use client";

import { placeLine } from "@/lib/places";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Loader2,
  ExternalLink,
  EyeOff,
  Sparkles,
  Radar,
  Info,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  runDiscoveryAction,
  dismissDiscoveredJobAction,
  trackDiscoveredJobAction,
  clearAllDiscoveredJobsAction,
  markDiscoveredJobAppliedAction,
} from "@/lib/discovery/actions";
import { Trash2 } from "lucide-react";
import { BUCKETS, SOURCE_KIND_LABEL } from "@/lib/discovery/labels";
import { searchJobs, type SearchContext } from "@/lib/search/engine";
import { formatSalaryRange } from "@/lib/format";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { comparePriority, isAiScreened, isNewListing, listingAgeDays } from "@/lib/discovery/sort";
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
  const [searchMode, setSearchMode] = useState<"search" | "explore" | "company" | "major">("search");
  const [matchValues, setMatchValues] = useState(false);
  const [seniorityFilter, setSeniorityFilter] = useState<string>("ALL");

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

  // Arriving from an alert email (/discover?job=<id>): scroll to that job
  // and mark it briefly. The ?job= form survives the sign-in redirect,
  // which drops a #hash.
  useEffect(() => {
    let id: string | null = null;
    try {
      id = new URLSearchParams(window.location.search).get("job") ?? (window.location.hash.match(/^#job-(.+)$/)?.[1] ?? null);
    } catch {
      id = null;
    }
    if (!id) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`job-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-primary");
      window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 4000);
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  const searchResult = useMemo(
    () => searchJobs({ jobs, query, context, limit: 200, mode, matchValues }),
    [jobs, query, context, mode, matchValues],
  );

  const topPicks = useMemo(() => {
    if (query.trim() !== "") return [];
    // baseline is already sorted by the highly-tuned blended relevance score (b.score)
    // Every listing is a candidate. This used to take only the top 10 by
    // lexical relevance and pick from those, so a Fit-90 match with plain
    // wording could never be a Top Pick.
    const baseline = searchJobs({ jobs, query: "", context, limit: 1000, mode: "BALANCED", matchValues });
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
          // A Top Pick is a promise: Work-ly read the whole posting against
          // your profile and rates it worth applying to. A quick score or a
          // Stretch is never enough, however fresh or keyword-rich.
          isAiScreened(r.job) &&
          (r.job.recommendation === "APPLY_NOW" || r.job.recommendation === "APPLY"),
      )
      .sort(comparePriority)
      .slice(0, 3);
  }, [jobs, query, context, matchValues]);

  const seniorityFilteredResults = useMemo(() => {
    if (seniorityFilter === "ALL") return searchResult.results;
    return searchResult.results.filter(result => result.job.seniority === seniorityFilter);
  }, [searchResult.results, seniorityFilter]);

  const visible = useMemo(() => {
    let filtered = seniorityFilteredResults;
    
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
      // Top Picks are already shown above - don't list the same card twice.
      const pickIds = new Set(topPicks.map((p) => p.job.id));
      filtered = filtered.filter((result) => !pickIds.has(result.job.id));
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
  }, [seniorityFilteredResults, activeBucket, sort, query, topPicks]);

  const counts = useMemo(() => {
    const all = seniorityFilteredResults;
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
  }, [seniorityFilteredResults]);

  const [upgradeRequired, setUpgradeRequired] = useState(false);

  function discover() {
    setMessage(null);
    setUpgradeRequired(false);
    setLastSearchTermsUsed(null);
    startTransition(async () => {
      // A network drop or a server timeout used to throw straight into the
      // page, which replaced Discover with "This page couldn't load" even
      // though the run had saved its results. Now it just says so.
      let result: Awaited<ReturnType<typeof runDiscoveryAction>>;
      try {
        result = await runDiscoveryAction(query || undefined, { expandSearch: searchMode === "explore" || searchMode === "company" || searchMode === "major" });
      } catch {
        setMessage("That search took longer than expected. Any jobs it found are saved - refresh the page to see them.");
        return;
      }
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

  const placeholder =
    searchMode === "explore"
      ? "Describe what interests you, e.g. climate tech data roles"
      : searchMode === "company"
        ? "A company or a role there, e.g. Analytics at Stripe"
        : searchMode === "major"
          ? "Your degree, e.g. Statistics"
          : "Filter your matches by title, company or skill";
  const actionLabel =
    searchMode === "explore" ? "Explore" : searchMode === "company" ? "Search company" : searchMode === "major" ? "Find roles" : "Find new jobs";
  const totalShown = seniorityFilteredResults.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label="Search"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  discover();
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={searchMode}
              onValueChange={(v: "search" | "explore" | "company" | "major") => {
                setSearchMode(v);
                setMode(v === "search" ? "BALANCED" : "EXPLORE");
              }}
            >
              <SelectTrigger className="h-10 w-[170px]" aria-label="Kind of search">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="search">My target role</SelectItem>
                <SelectItem value="explore">Explore ideas</SelectItem>
                <SelectItem value="company">A specific company</SelectItem>
                <SelectItem value="major">By degree</SelectItem>
              </SelectContent>
            </Select>
            <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
              <SelectTrigger className="h-10 w-[140px]" aria-label="Level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All levels</SelectItem>
                <SelectItem value="ENTRY">Entry</SelectItem>
                <SelectItem value="JUNIOR">Junior</SelectItem>
                <SelectItem value="MID">Mid</SelectItem>
                <SelectItem value="SENIOR">Senior</SelectItem>
                <SelectItem value="LEAD">Lead and above</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={discover} disabled={pending} className="h-10 gap-2">
              {pending ? <WorklyLoader className="animate-spin" /> : searchMode === "search" ? <Radar /> : <Sparkles className="size-4" />}
              {pending ? "Searching… about a minute" : actionLabel}
            </Button>
          </div>
        </div>
        <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={matchValues}
            onChange={(e) => setMatchValues(e.target.checked)}
            className="size-4 rounded accent-[var(--primary)]"
          />
          Rank jobs that match my values higher
          <span title="Uses the values Work-ly found in your profile (e.g. sustainability, fast pace). Aligned jobs rank higher.">
            <Info className="size-3.5" aria-hidden />
          </span>
        </label>
      </div>

      {message && <p className="text-sm text-muted-foreground animate-in fade-in">{message}</p>}

      {lastSearchTermsUsed && (
        <p className="text-sm text-muted-foreground">
          Searched for <span className="text-foreground">{lastSearchTermsUsed.join(", ")}</span>.
        </p>
      )}

      {upgradeRequired && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">Daily search limit reached.</span> Free accounts get 5 searches a
            day; it resets within 24 hours. Pro removes the cap.
          </AlertDescription>
        </Alert>
      )}

      {searchResult.expansion.expandedRoles.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Also showing related roles:{" "}
            <span className="text-foreground">{[...new Set(searchResult.expansion.expandedRoles.map((r) => r.role))].join(", ")}</span>.
          </span>
        </p>
      )}

      {/* Bands, as filter chips, and sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by match">
          <FilterChip active={activeBucket === null} onClick={() => setActiveBucket(null)} label="Best matches" />
          {BUCKETS.map((bucket) => (
            <FilterChip
              key={bucket.key}
              active={activeBucket === bucket.key}
              onClick={() => setActiveBucket(activeBucket === bucket.key ? null : bucket.key)}
              label={bucket.label}
              count={counts[bucket.key]}
              tone={bucket.tone}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalShown} found · Sort</span>
          <Select value={sort} onValueChange={(v: "priority" | "fit" | "recent") => setSort(v)}>
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Best for you</SelectItem>
              <SelectItem value="fit">Highest fit</SelectItem>
              <SelectItem value="recent">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {topPicks.length > 0 && activeBucket === null && (
        <section className="flex flex-col gap-2" aria-labelledby="top-picks">
          <h3 id="top-picks" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Top picks
          </h3>
          <div className="flex flex-col gap-2">
            {topPicks.map((result) => (
              <DiscoveryCard key={"top-" + result.job.id} job={result.job} reasons={result.reasons} viaExpansion={result.viaExpansion} onMessage={setMessage} isTopPick />
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 && topPicks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <div className="relative size-24 opacity-80">
            <Image src="/workly-bot.png" alt="" fill sizes="96px" className="object-contain" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            {jobs.length === 0
              ? "No jobs yet. Press Find new jobs and Work-ly searches the boards for roles that fit you."
              : activeBucket == null && searchResult.results.length > 0
                ? "No strong matches in this search. Check Low priority, or search again."
                : "Nothing matches this filter."}
          </p>
        </div>
      ) : (
        visible.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Jobs">
            {topPicks.length > 0 && activeBucket === null && (
              <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">More matches</h3>
            )}
            {visible.map((result) => (
              <DiscoveryCard key={result.job.id} job={result.job} reasons={result.reasons} viaExpansion={result.viaExpansion} onMessage={setMessage} mode={mode} />
            ))}
          </section>
        )
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        active ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {label}
      {count != null && (
        <span className={cn("tabular-nums text-xs font-semibold", count > 0 ? tone : "text-muted-foreground/70")}>{count}</span>
      )}
    </button>
  );
}

/**
 * Some sources (Adzuna, Jooble) only return a few sentences of the posting,
 * so any fit read from them is shallow. Say so on the card instead of
 * letting a number built on two skills look like a full analysis.
 */
function isSummaryOnly(job: DiscoveredJob): boolean {
  return (job.description?.length ?? 0) < 700 && !isAiScreened(job);
}

function DiscoveryCard({
  job,
  reasons,
  viaExpansion,
  onMessage,
  isTopPick,
}: {
  job: DiscoveredJob;
  reasons: string[];
  viaExpansion: { role: string; rationale: string } | null;
  onMessage: (message: string | null) => void;
  mode?: string;
  isTopPick?: boolean;
}) {
  // Each card has its own busy state: one "Analyze" used to put a spinner
  // on every card's button and lock the whole list.
  const router = useRouter();
  const [busy, setBusy] = useState<null | "track" | "applied">(null);
  const [hidden, setHidden] = useState(false);
  const [, startCardTransition] = useTransition();

  /** Straight to the full analysis: no "added", then Opportunities, then find it. */
  function analyze() {
    setBusy("track");
    onMessage(null);
    startCardTransition(async () => {
      const outcome = await trackDiscoveredJobAction(job.id);
      if (outcome.opportunityId) {
        router.push(`/opportunities/${outcome.opportunityId}`);
        return;
      }
      onMessage(outcome.error ?? "That didn't work. Please try again.");
      setBusy(null);
    });
  }

  function alreadyApplied() {
    setBusy("applied");
    startCardTransition(async () => {
      const outcome = await markDiscoveredJobAppliedAction(job.id);
      if (outcome.error) {
        onMessage(outcome.error);
        setBusy(null);
        return;
      }
      setHidden(true);
      onMessage(`Logged "${job.title}" as applied in your Applications. It won't show up here again, from any job board.`);
    });
  }

  function notForMe() {
    setHidden(true);
    startCardTransition(() => dismissDiscoveredJobAction(job.id));
  }

  const pending = busy !== null;
  if (hidden) return null;

  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const meta = [
    job.company,
    placeLine(job.location, job.country, ", "),
    job.workMode ? WORK_MODE_SHORT[job.workMode] : null,
    salary,
  ].filter(Boolean) as string[];
  // One sentence on why it fits (the AI screen's verdict when there is one),
  // and the one thing missing. The card used to list four or five bullets,
  // most of them the same on every card.
  const verdict = job.matchReasons.find((r) => r.kind === "screen")?.text ?? reasons.find((r) => !GENERIC_REASON.test(r)) ?? null;
  const missing = job.matchReasons.find((r) => r.kind === "gap")?.text ?? null;
  const showFit = job.fitScore != null && (job.fitCoverage == null || job.fitCoverage >= MIN_COVERAGE_FOR_SCORE);
  const bucket = BUCKETS.find((b) =>
    b.key === "applyNow"
      ? job.recommendation === "APPLY_NOW"
      : b.key === "strong"
        ? job.recommendation === "APPLY"
        : b.key === "stretch"
          ? job.recommendation === "STRETCH"
          : job.recommendation === "LOW_PRIORITY" || job.recommendation === "SKIP",
  );
  const age = job.postedAt ? Math.max(0, Math.floor(listingAgeDays(job))) : null;

  return (
    // The dashboard briefing links to /discover#job-<id>.
    <article
      id={`job-${job.id}`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card p-4 shadow-sm transition-colors sm:p-5",
        isTopPick ? "border-primary/30" : "border-border hover:border-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[15px] font-semibold leading-snug text-foreground">{job.title}</h4>
            {isNewListing(job) && <Badge variant="success">New</Badge>}
            {isSummaryOnly(job) && (
              <Badge variant="outline" className="text-muted-foreground" title="This board only shares a short summary. Open the posting for a full check.">
                Summary only
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta.join(" · ") || "-"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          {showFit ? (
            <span className={cn("text-2xl font-semibold leading-none tabular-nums", bucket?.tone ?? "text-foreground")}>{job.fitScore}</span>
          ) : (
            <span className="text-sm text-muted-foreground">–</span>
          )}
          <span className={cn("mt-1 text-xs font-medium", bucket?.tone ?? "text-muted-foreground")}>{bucket?.label ?? "Fit"}</span>
        </div>
      </div>

      {(verdict || missing || viaExpansion) && (
        <div className="mt-3 flex flex-col gap-1 text-sm">
          {verdict && <p className="leading-relaxed text-foreground/85">{verdict}</p>}
          {missing && <p className="text-xs text-muted-foreground">{missing}</p>}
          {viaExpansion && (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              Related to your search: {viaExpansion.role}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {job.convertedOpportunityId ? (
            <Button asChild size="sm">
              <Link href={`/opportunities/${job.convertedOpportunityId}`}>See my fit</Link>
            </Button>
          ) : isSummaryOnly(job) && job.sourceUrl ? (
            <Button asChild size="sm">
              <a href={job.sourceUrl} target="_blank" rel="noreferrer noopener" title="Open the full posting, then use Save to Work-ly">
                Open full posting
              </a>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={analyze} disabled={pending}>
              {busy === "track" ? <WorklyLoader className="animate-spin" /> : null}
              {busy === "track" ? "Analyzing… about 30 seconds" : "Analyze & track"}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={alreadyApplied} disabled={pending} title="Logs it in Applications and stops showing this role">
            {busy === "applied" ? <WorklyLoader className="animate-spin" /> : <CheckCircle2 />}
            Already applied
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={notForMe}
            disabled={pending}
            title="Hides this role, including copies from other job boards"
          >
            <EyeOff />
            Not for me
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {age != null && <span>{age === 0 ? "Posted today" : `Posted ${age}d ago`}</span>}
          {age != null && <span aria-hidden>·</span>}
          <span title={SOURCE_KIND_LABEL[job.sourceKind]}>via {job.sourceName}</span>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
            >
              Original
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </p>
      </div>
    </article>
  );
}

const WORK_MODE_SHORT: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" };
/** Reasons that read the same on every card, so they say nothing about this one. */
const GENERIC_REASON = /^(pitched at your current level|remote, making it broadly|in [^,]+, where you want to work)/i;

import { AddFeedForm } from "@/components/discovery/add-feed-form";

export function DiscoverySourcesCard({
  sources,
}: {
  sources: { id: string; name: string; kind: string; status: string; legalBasis: string; lastRunFoundCount: number; errorHint?: string | null }[];
}) {
  // Dozens of company boards used to be listed one per row, which read as a
  // broken page. Now: one summary line, the full list on request. A board
  // that timed out once isn't an error the person can do anything about;
  // it's simply tried again on the next search.
  const found = sources.filter((s) => s.lastRunFoundCount > 0).length;
  const timedOut = (s: { errorHint?: string | null }) => Boolean(s.errorHint && /too long/i.test(s.errorHint));
  const unreachable = sources.filter(timedOut).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where these come from</CardTitle>
        <CardDescription>
          {sources.length === 0
            ? "No sources configured yet."
            : `Searching ${sources.length} job boards and company career sites. ${found} had matching jobs last time${
                unreachable > 0 ? `; ${unreachable} didn't answer in time and will be tried again on your next search` : ""
              }.`}
        </CardDescription>
      </CardHeader>
      {sources.length > 0 && (
        <CardContent>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
              Show all {sources.length} sources
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {[...sources]
                .sort((a, b) => b.lastRunFoundCount - a.lastRunFoundCount)
                .map((source) => (
                  <div key={source.id} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{source.name}</span>
                      <Badge variant="outline">{source.kind}</Badge>
                      <Badge variant="secondary">{timedOut(source) ? "Will retry" : source.status}</Badge>
                      {source.lastRunFoundCount > 0 && (
                        <span className="text-xs text-muted-foreground">{source.lastRunFoundCount} last run</span>
                      )}
                    </div>
                    {source.errorHint && <p className="text-xs text-muted-foreground">{source.errorHint}</p>}
                  </div>
                ))}
            </div>
          </details>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <AddFeedForm />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={async () => {
                if (confirm("Remove every job Work-ly has found for you? Jobs you've tracked stay.")) {
                  await clearAllDiscoveredJobsAction();
                }
              }}
            >
              <Trash2 className="size-4" />
              Clear found jobs
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
