"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X, MapPin } from "lucide-react";

import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass } from "lucide-react";
import {
  EMPLOYMENT_TYPE_LABEL,
  RECOMMENDATION_LABEL,
  SENIORITY_LABEL,
  WORK_MODE_LABEL,
} from "@/lib/jobs/labels";
import {
  hasLocationPreference,
  matchesLocationPreference,
  type LocationPreference,
} from "@/lib/jobs/location-match";
import { cn } from "@/lib/utils";
import type { OpportunityWithJob } from "@/lib/db/types";

type TabKey = "all" | "apply-now" | "high-priority" | "stretch" | "saved" | "analyzed" | "applied";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "apply-now", label: "Apply Now" },
  { key: "high-priority", label: "High Priority" },
  { key: "stretch", label: "Stretch" },
  { key: "saved", label: "Saved" },
  { key: "analyzed", label: "Analyzed" },
  { key: "applied", label: "Applied" },
];

const HIGH_PRIORITY_THRESHOLD = 75;

type SortKey = "priority" | "fit" | "deadline" | "discovered" | "salary";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "fit", label: "Fit" },
  { key: "deadline", label: "Deadline" },
  { key: "discovered", label: "Date discovered" },
  { key: "salary", label: "Salary" },
];

const ALL = "__all__";

interface Filters {
  role: string;
  location: string;
  industry: string;
  country: string;
  seniority: string;
  workMode: string;
  employmentType: string;
  recommendation: string;
  minSalary: string;
  minFit: string;
  minPriority: string;
}

const EMPTY_FILTERS: Filters = {
  role: "",
  location: "",
  industry: ALL,
  country: ALL,
  seniority: ALL,
  workMode: ALL,
  employmentType: ALL,
  recommendation: ALL,
  minSalary: "",
  minFit: "",
  minPriority: "",
};

function tabMatch(tab: TabKey, o: OpportunityWithJob): boolean {
  switch (tab) {
    case "all":
      return true;
    case "apply-now":
      return o.recommendation === "APPLY_NOW";
    case "high-priority":
      return o.priorityScore >= HIGH_PRIORITY_THRESHOLD;
    case "stretch":
      return o.recommendation === "STRETCH";
    case "saved":
      return o.isSaved;
    case "analyzed":
      return o.status === "DISCOVERED";
    case "applied":
      return o.status === "APPLIED";
  }
}

const NO_LOCATION_PREFERENCE: LocationPreference = {
  homeLocation: null,
  preferredLocations: [],
  openToRemote: true,
};

export function OpportunitiesBoard({ university,
  opportunities,
  locationPreference = NO_LOCATION_PREFERENCE,
}: {
  opportunities: OpportunityWithJob[];
  university?: string | null;
  /** Home base, other acceptable places, and whether remote counts. Set in Settings. */
  locationPreference?: LocationPreference;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("priority");
  const [showFilters, setShowFilters] = useState(false);
  const [matchMyLocations, setMatchMyLocations] = useState(false);

  const canFilterByLocation = useMemo(
    () => hasLocationPreference(locationPreference),
    [locationPreference],
  );

  const options = useMemo(() => {
    const industries = new Set<string>();
    const countries = new Set<string>();
    const seniorities = new Set<string>();
    for (const o of opportunities) {
      if (o.job.industry) industries.add(o.job.industry);
      if (o.job.country) countries.add(o.job.country);
      if (o.job.seniority) seniorities.add(o.job.seniority);
    }
    return {
      industries: Array.from(industries).sort(),
      countries: Array.from(countries).sort(),
      seniorities: Array.from(seniorities).sort(
        (a, b) => SENIORITY_LABEL[a]?.localeCompare(SENIORITY_LABEL[b] ?? "") ?? 0,
      ),
    };
  }, [opportunities]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: 0,
      "apply-now": 0,
      "high-priority": 0,
      stretch: 0,
      saved: 0,
      analyzed: 0,
      applied: 0,
    };
    for (const o of opportunities) {
      for (const t of TABS) {
        if (tabMatch(t.key, o)) counts[t.key] += 1;
      }
    }
    return counts;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const roleQuery = filters.role.trim().toLowerCase();
    const locationQuery = filters.location.trim().toLowerCase();
    const minSalary = filters.minSalary ? Number(filters.minSalary) : null;
    const minFit = filters.minFit ? Number(filters.minFit) : null;
    const minPriority = filters.minPriority ? Number(filters.minPriority) : null;

    return opportunities.filter((o) => {
      if (!tabMatch(tab, o)) return false;
      const { job } = o;

      if (roleQuery && !`${job.title ?? ""} ${job.company ?? ""}`.toLowerCase().includes(roleQuery)) return false;
      if (locationQuery && !(job.location ?? "").toLowerCase().includes(locationQuery)) return false;
      if (filters.industry !== ALL && job.industry !== filters.industry) return false;
      if (filters.country !== ALL && job.country !== filters.country) return false;
      if (filters.seniority !== ALL && job.seniority !== filters.seniority) return false;
      if (filters.workMode !== ALL && job.workMode !== filters.workMode) return false;
      if (filters.employmentType !== ALL && job.employmentType !== filters.employmentType) return false;
      if (filters.recommendation !== ALL && o.recommendation !== filters.recommendation) return false;
      if (minSalary != null && (job.salaryMax ?? job.salaryMin ?? -Infinity) < minSalary) return false;
      if (minFit != null && o.fitScore < minFit) return false;
      if (minPriority != null && o.priorityScore < minPriority) return false;
      if (matchMyLocations && !matchesLocationPreference(job.location, job.workMode, locationPreference))
        return false;

      return true;
    });
  }, [opportunities, tab, filters, matchMyLocations, locationPreference]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "priority":
        return copy.sort((a, b) => b.priorityScore - a.priorityScore);
      case "fit":
        return copy.sort((a, b) => b.fitScore - a.fitScore);
      case "deadline":
        return copy.sort((a, b) => {
          const ad = a.job.deadline ? new Date(a.job.deadline).getTime() : Infinity;
          const bd = b.job.deadline ? new Date(b.job.deadline).getTime() : Infinity;
          return ad - bd;
        });
      case "discovered":
        return copy.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
      case "salary":
        return copy.sort((a, b) => {
          const av = a.job.salaryMax ?? a.job.salaryMin ?? -1;
          const bv = b.job.salaryMax ?? b.job.salaryMin ?? -1;
          return bv - av;
        });
    }
  }, [filtered, sort]);

  const activeFilterCount = Object.entries(filters).filter(([key, v]) => {
    if (key === "role" || key === "location" || key === "minSalary" || key === "minFit" || key === "minPriority") {
      return v !== "";
    }
    return v !== ALL;
  }).length;

  return (
    <div className="flex flex-col gap-4">
      {/*
        Toggle buttons rather than a Tabs widget.

        These filter one list in place, they do not switch between panels.
        Using Radix Tabs here put an aria-controls on every trigger pointing
        at a TabsContent that does not exist, which axe flags as a critical
        invalid ARIA value and which a screen reader would follow to nothing.
        aria-pressed says what these actually are: a set of toggles.
      */}
      <div
        role="group"
        aria-label="Filter opportunities"
        className="inline-flex w-fit flex-wrap items-center gap-0.5 rounded-lg bg-muted p-[3px]"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none",
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="text-muted-foreground">{tabCounts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal />
          Filters
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-primary">{activeFilterCount}</span>}
        </Button>
        {activeFilterCount > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X />
            Clear filters
          </Button>
        )}
        {canFilterByLocation && (
          <Button
            type="button"
            variant={matchMyLocations ? "default" : "outline"}
            size="sm"
            onClick={() => setMatchMyLocations((v) => !v)}
            title="Only show roles in the places you set in Settings"
          >
            <MapPin />
            Match my locations
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="opp-sort" className="text-xs text-muted-foreground">
            Sort by
          </Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger id="opp-sort" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-role">Role or company</Label>
            <Input
              id="f-role"
              placeholder="e.g. Product Analyst"
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-location">Location</Label>
            <Input
              id="f-location"
              placeholder="e.g. London"
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Industry</Label>
            <Select value={filters.industry} onValueChange={(v) => setFilters((f) => ({ ...f, industry: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All industries</SelectItem>
                {options.industries.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Country</Label>
            <Select value={filters.country} onValueChange={(v) => setFilters((f) => ({ ...f, country: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All countries</SelectItem>
                {options.countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Seniority</Label>
            <Select value={filters.seniority} onValueChange={(v) => setFilters((f) => ({ ...f, seniority: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All levels</SelectItem>
                {options.seniorities.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SENIORITY_LABEL[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Work mode</Label>
            <Select value={filters.workMode} onValueChange={(v) => setFilters((f) => ({ ...f, workMode: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any</SelectItem>
                {Object.entries(WORK_MODE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Employment type</Label>
            <Select
              value={filters.employmentType}
              onValueChange={(v) => setFilters((f) => ({ ...f, employmentType: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any</SelectItem>
                {Object.entries(EMPLOYMENT_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Recommendation</Label>
            <Select
              value={filters.recommendation}
              onValueChange={(v) => setFilters((f) => ({ ...f, recommendation: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any</SelectItem>
                {Object.entries(RECOMMENDATION_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-salary">Min salary</Label>
            <Input
              id="f-salary"
              type="number"
              placeholder="e.g. 90000"
              value={filters.minSalary}
              onChange={(e) => setFilters((f) => ({ ...f, minSalary: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-fit">Min fit</Label>
            <Input
              id="f-fit"
              type="number"
              min={0}
              max={100}
              placeholder="0-100"
              value={filters.minFit}
              onChange={(e) => setFilters((f) => ({ ...f, minFit: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-priority">Min priority</Label>
            <Input
              id="f-priority"
              type="number"
              min={0}
              max={100}
              placeholder="0-100"
              value={filters.minPriority}
              onChange={(e) => setFilters((f) => ({ ...f, minPriority: e.target.value }))}
            />
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No opportunities match"
          description="Try a different tab or clear your filters."
          action={activeFilterCount > 0 ? { label: "Clear filters", onClick: () => setFilters(EMPTY_FILTERS) } : undefined}
        />
      ) : (
        // Two columns at most. Three narrow cards per row was what forced
        // everything inside them to be cramped in the first place.
        <div className="stagger-children grid gap-4 sm:grid-cols-2">
          {sorted.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} university={university} />
          ))}
        </div>
      )}
    </div>
  );
}
