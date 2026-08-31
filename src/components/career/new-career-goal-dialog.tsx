"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";

import {
  createCareerGoalAction,
  updateCareerGoalAction,
  type CareerActionState,
} from "@/lib/career/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CareerGoal } from "@/lib/db/types";

const initialState: CareerActionState = {};

const WORK_MODES = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "Onsite" },
] as const;

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FREELANCE", label: "Freelance" },
] as const;

const SENIORITY_LEVELS = [
  { value: "ENTRY", label: "Entry" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "EXECUTIVE", label: "Executive" },
] as const;

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export function NewCareerGoalDialog({ goal, homeLocation }: { goal?: CareerGoal; homeLocation?: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CareerActionState>(initialState);
  const [pending, startTransition] = useTransition();
  const [isUncertain, setIsUncertain] = useState(goal?.isUncertain ?? false);
  const [workModes, setWorkModes] = useState<string[]>(goal?.workModes ?? []);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(goal?.employmentTypes ?? []);
  const [seniority, setSeniority] = useState<string>(goal?.seniority ?? "");
  const [status, setStatus] = useState<string>(goal?.status ?? "ACTIVE");
  const isEdit = !!goal;

  function toggleValue(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateCareerGoalAction(goal.id, initialState, formData)
        : await createCareerGoalAction(initialState, formData);
      if (result.success) {
        setState(initialState);
        setOpen(false);
      } else {
        setState(result);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setState(initialState);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit goal">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            New goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit career goal" : "New career goal"}</DialogTitle>
            <DialogDescription>
              What are you working toward? This steers which opportunities get prioritized and how job
              analyses are scored.
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              name="title"
              placeholder="Move into a Staff role"
              defaultValue={goal?.title ?? ""}
              required
            />
            {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title}</p>}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3">
            <Checkbox
              id="goal-uncertain"
              name="isUncertain"
              checked={isUncertain}
              onCheckedChange={(checked) => setIsUncertain(checked === true)}
            />
            <div>
              <Label htmlFor="goal-uncertain" className="font-normal">
                I&apos;m not sure yet
              </Label>
              <p className="text-xs text-muted-foreground">
                Fine to leave the details below blank or partial. Work-ly will treat this goal as exploratory
                rather than assuming a firm target.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-primary-role">Primary target role</Label>
              <Input
                id="goal-primary-role"
                name="primaryTargetRole"
                placeholder="Staff Engineer"
                defaultValue={goal?.primaryTargetRole ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-secondary-roles">Secondary roles</Label>
              <Input
                id="goal-secondary-roles"
                name="secondaryTargetRoles"
                placeholder="Engineering Manager, Tech Lead"
                defaultValue={goal?.secondaryTargetRoles?.join(", ") ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-industries">Industries</Label>
            <Input
              id="goal-industries"
              name="industries"
              placeholder="Fintech, Healthcare"
              defaultValue={goal?.industries?.join(", ") ?? ""}
            />
            <p className="text-xs text-muted-foreground">Comma-separated.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-countries">Countries</Label>
            <Input
              id="goal-countries"
              name="countries"
              placeholder="United States, Canada"
              defaultValue={goal?.countries?.join(", ") ?? ""}
            />
            {/* Locations used to be edited here too, which meant someone
                with three goals had three competing answers to "where would
                you work". They now live once, on the account. */}
            <p className="text-xs text-muted-foreground">
              {homeLocation ? (
                <>
                  Working from <span className="font-medium text-foreground">{homeLocation}</span>.
                </>
              ) : (
                <>No home location set yet.</>
              )}{" "}
              <a href="/settings" className="underline underline-offset-2">
                Manage your locations in Settings
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Work mode</Label>
            <div className="flex flex-wrap gap-4">
              {WORK_MODES.map((mode) => (
                <label key={mode.value} className="flex items-center gap-1.5 text-sm font-normal text-foreground">
                  <Checkbox
                    checked={workModes.includes(mode.value)}
                    onCheckedChange={() => toggleValue(workModes, setWorkModes, mode.value)}
                  />
                  {mode.label}
                </label>
              ))}
            </div>
            {workModes.map((v) => (
              <input key={v} type="hidden" name="workModes" value={v} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Employment type</Label>
            <div className="flex flex-wrap gap-4">
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type.value} className="flex items-center gap-1.5 text-sm font-normal text-foreground">
                  <Checkbox
                    checked={employmentTypes.includes(type.value)}
                    onCheckedChange={() => toggleValue(employmentTypes, setEmploymentTypes, type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
            {employmentTypes.map((v) => (
              <input key={v} type="hidden" name="employmentTypes" value={v} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-seniority">Seniority</Label>
              <input type="hidden" name="seniority" value={seniority} />
              <Select value={seniority || undefined} onValueChange={setSeniority}>
                <SelectTrigger id="goal-seniority" className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-status">Status</Label>
              <input type="hidden" name="status" value={status} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="goal-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-salary-min">Salary min</Label>
              <Input
                id="goal-salary-min"
                name="salaryMin"
                type="number"
                min={0}
                defaultValue={goal?.salaryMin ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-salary-max">Salary max</Label>
              <Input
                id="goal-salary-max"
                name="salaryMax"
                type="number"
                min={0}
                defaultValue={goal?.salaryMax ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-salary-currency">Currency</Label>
              <Input
                id="goal-salary-currency"
                name="salaryCurrency"
                placeholder="USD"
                defaultValue={goal?.salaryCurrency ?? "USD"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-timeframe">Timeframe</Label>
            <Input
              id="goal-timeframe"
              name="timeframe"
              placeholder="Within 12 months"
              defaultValue={goal?.timeframe ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-notes">Notes</Label>
            <Textarea
              id="goal-notes"
              name="notes"
              rows={3}
              placeholder="Anything else worth noting."
              defaultValue={goal?.notes ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
