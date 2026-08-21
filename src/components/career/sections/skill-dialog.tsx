"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import { createSkillAction, updateSkillAction, type EntityActionState } from "@/lib/career/entity-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Skill } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

const CATEGORIES = [
  { value: "TECHNICAL", label: "Technical" },
  { value: "SOFT", label: "Soft skill" },
  { value: "DOMAIN", label: "Domain knowledge" },
  { value: "TOOL", label: "Tool" },
  { value: "LANGUAGE", label: "Language" },
  { value: "OTHER", label: "Other" },
];

const PROFICIENCIES = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

const EXPERIENCE_LEVELS = [
  { value: "UNDER_1_YEAR", label: "Under 1 year" },
  { value: "ONE_TO_3_YEARS", label: "1–3 years" },
  { value: "THREE_TO_5_YEARS", label: "3–5 years" },
  { value: "FIVE_PLUS_YEARS", label: "5+ years" },
];

const EVIDENCE_LEVELS = [
  { value: "STATED", label: "Stated (I say I have it)" },
  { value: "DEMONSTRATED", label: "Demonstrated (used in a project/role)" },
  { value: "CERTIFIED", label: "Certified" },
  { value: "INFERRED", label: "Inferred" },
];

const RECENCY = [
  { value: "CURRENT", label: "Currently using" },
  { value: "WITHIN_1_YEAR", label: "Within the last year" },
  { value: "WITHIN_3_YEARS", label: "Within the last 3 years" },
  { value: "OVER_3_YEARS", label: "Over 3 years ago" },
  { value: "UNKNOWN", label: "Not sure" },
];

export function SkillDialog({ skill }: { skill?: Skill }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const isEdit = !!skill;

  const [category, setCategory] = useState<string>(skill?.category ?? "TECHNICAL");
  const [proficiency, setProficiency] = useState<string>(skill?.proficiency ?? "");
  const [experienceLevel, setExperienceLevel] = useState<string>(skill?.experienceLevel ?? "");
  const [evidenceLevel, setEvidenceLevel] = useState<string>(skill?.evidenceLevel ?? "STATED");
  const [recency, setRecency] = useState<string>(skill?.recency ?? "CURRENT");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateSkillAction(skill.id, EMPTY, formData)
        : await createSkillAction(EMPTY, formData);
      if (result.success) {
        setState(EMPTY);
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
        if (!next) setState(EMPTY);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit skill">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit skill" : "Add skill"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Saving confirms this as a skill of yours."
                : "Add a skill and how confident you are in it. This shapes how it's used later."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skill-name">Skill name</Label>
            <Input id="skill-name" name="name" required defaultValue={skill?.name ?? ""} placeholder="TypeScript" />
            {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-category">Category</Label>
              <input type="hidden" name="category" value={category} />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="skill-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-evidence">Evidence</Label>
              <input type="hidden" name="evidenceLevel" value={evidenceLevel} />
              <Select value={evidenceLevel} onValueChange={setEvidenceLevel}>
                <SelectTrigger id="skill-evidence" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_LEVELS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-proficiency">Proficiency</Label>
              <input type="hidden" name="proficiency" value={proficiency} />
              <Select value={proficiency || undefined} onValueChange={setProficiency}>
                <SelectTrigger id="skill-proficiency" className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-experience">Experience</Label>
              <input type="hidden" name="experienceLevel" value={experienceLevel} />
              <Select value={experienceLevel || undefined} onValueChange={setExperienceLevel}>
                <SelectTrigger id="skill-experience" className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skill-recency">Recency</Label>
            <input type="hidden" name="recency" value={recency} />
            <Select value={recency} onValueChange={setRecency}>
              <SelectTrigger id="skill-recency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECENCY.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
