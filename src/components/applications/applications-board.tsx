"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2, GripVertical, ArrowRight, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { setApplicationStatusAction } from "@/lib/applications/actions";
import {
  PIPELINE_COLUMNS,
  getApplicationStatusLabel,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_VARIANT,
  DATE_RANGE_LABEL,
} from "@/lib/applications/labels";
import {
  applyFilters,
  filterOptions,
  type AnalyticsFilters,
  type DateRangeKey,
} from "@/lib/applications/analytics";
import type { Application, ApplicationStatus } from "@/lib/db/types";
import { classifyStudentJob } from "@/lib/student/legal-limits";
import { IconStudent } from "@/components/icons";

const ALL = "__all__";

export function ApplicationsBoard({ university, applications, isFreelanceMode = false }: { applications: Application[]; isFreelanceMode?: boolean; university?: string | null }) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [filters, setFilters] = useState<AnalyticsFilters>({ dateRange: "ALL" });
  const [sort, setSort] = useState<"recent" | "fit">("recent");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null);
  const [pending, startTransition] = useTransition();

  const options = useMemo(() => filterOptions(applications), [applications]);
  const filtered = useMemo(() => {
    const list = applyFilters(applications, filters);
    return [...list].sort((a, b) => {
      if (sort === "fit") {
        return (b.fitScoreAtApply ?? 0) - (a.fitScoreAtApply ?? 0);
      }
      // "recent" (default)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [applications, filters, sort]);

  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const column of PIPELINE_COLUMNS) map.set(column, []);
    for (const application of filtered) {
      map.set(application.status, [...(map.get(application.status) ?? []), application]);
    }
    return map;
  }, [filtered]);

  function move(id: string, status: ApplicationStatus) {
    startTransition(() => setApplicationStatusAction(id, status));
  }

  function setFilter(key: keyof AnalyticsFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value === ALL ? undefined : value }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <FilterSelect
            label="Role"
            value={filters.role ?? ALL}
            options={options.roles}
            onChange={(v) => setFilter("role", v)}
          />
          <FilterSelect
            label="Industry"
            value={filters.industry ?? ALL}
            options={options.industries}
            onChange={(v) => setFilter("industry", v)}
          />
          <FilterSelect
            label="Company"
            value={filters.company ?? ALL}
            options={options.companies}
            onChange={(v) => setFilter("company", v)}
          />
          <FilterSelect
            label="Location"
            value={filters.location ?? ALL}
            options={options.locations}
            onChange={(v) => setFilter("location", v)}
          />
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Date</Label>
            <Select
              value={filters.dateRange ?? "ALL"}
              onValueChange={(v) => setFilters((p) => ({ ...p, dateRange: v as DateRangeKey }))}
            >
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGE_LABEL).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "table")}>
          <TabsList>
            <TabsTrigger value="kanban">
              <LayoutGrid className="size-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table2 className="size-3.5" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {applications.length} application
        {applications.length === 1 ? "" : "s"}
        {pending && " · saving…"}
      </p>

      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {PIPELINE_COLUMNS.map((column) => {
            const items = byStatus.get(column) ?? [];
            return (
              <div
                key={column}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(column);
                }}
                onDragLeave={() => setDropTarget((t) => (t === column ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  const id = e.dataTransfer.getData("text/plain") || dragging;
                  if (id) move(id, column);
                  setDragging(null);
                }}
                className={cn(
                  "flex w-[240px] shrink-0 flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-2.5 transition-colors",
                  dropTarget === column && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-foreground">
                    {getApplicationStatusLabel(column, isFreelanceMode)}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
                </div>

                {items.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nothing here</p>
                ) : (
                  items.map((application) => (
                    <div
                      key={application.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", application.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(application.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "group flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 active:cursor-grabbing",
                        dragging === application.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        <Link
                          href={`/applications/${application.id}`}
                          className="text-sm font-medium leading-tight text-foreground hover:underline line-clamp-2 break-words"
                        >
                          {application.roleTitle}
                        </Link>
                      </div>
                      
                      {(() => {
                        const kind = university ? classifyStudentJob({
                          title: application.roleTitle,
                          company: application.company,
                          employmentType: null,
                          description: null,
                          location: application.location,
                          university
                        }) : null;
                        return (kind && kind !== "wrong-location" && true) ? (
                          <Badge variant="outline" className="w-fit border-primary/50 text-primary bg-primary/5 gap-1 mt-0.5 whitespace-nowrap px-1.5 py-0 text-[10px]">
                            <IconStudent className="size-2.5" />
                            {kind === "on-campus" ? "On-Campus" : kind === "internship" ? "Internship" : "Off-Campus"}
                          </Badge>
                        ) : null;
                      })()}
                      {application.company && (
                        <p className="pl-5 text-xs text-muted-foreground truncate">{application.company}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pl-5">
                        {application.fitScoreAtApply != null && (
                          <Badge variant="outline">Fit {application.fitScoreAtApply}</Badge>
                        )}
                        {application.priorityScoreAtApply != null && (
                          <Badge variant="outline">Pri {application.priorityScoreAtApply}</Badge>
                        )}
                      </div>

                      {/* Keyboard/touch fallback: drag and drop alone would
                          make the board unusable without a mouse. */}
                      <div className="pl-5">
                        <Select
                          value={application.status}
                          onValueChange={(v) => move(application.id, v as ApplicationStatus)}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 w-full text-xs"
                            aria-label={`Move ${application.roleTitle} to another stage`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_COLUMNS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {getApplicationStatusLabel(s, isFreelanceMode)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 font-medium">Fit</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No applications match these filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((application) => (
                      <tr key={application.id} className="transition-colors hover:bg-secondary/40">
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                          {application.roleTitle}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">
                          {application.company ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={application.status}
                            onValueChange={(v) => move(application.id, v as ApplicationStatus)}
                          >
                            <SelectTrigger
                              size="sm"
                              className="h-7 w-[140px] text-xs font-medium"
                              aria-label={`Move ${application.roleTitle} to another stage`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE_COLUMNS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {getApplicationStatusLabel(s, isFreelanceMode)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {application.dateApplied
                            ? new Date(application.dateApplied).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {application.fitScoreAtApply ?? "-"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {application.priorityScoreAtApply ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/applications/${application.id}`}>
                              Open
                              <ArrowRight />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pending && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue placeholder={`All ${label.toLowerCase()}s`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All {label.toLowerCase()}s</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
