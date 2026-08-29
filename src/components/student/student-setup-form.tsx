"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveStudentProfileAction, type StudentActionState } from "@/lib/student/actions";
import type { CareerProfile } from "@/lib/db/types";
import type { SupportedStudentCountry } from "@/lib/student/country-rules-db";
import { useState } from "react";

const initialState: StudentActionState = {};

/**
 * Four fields, and only the first two do much work.
 *
 * University is what lets Workly recognise a campus job: an employer name
 * matching your own institution is the single strongest signal that a role
 * is on-campus, which in turn determines which work rules apply to it.
 *
 * Country is asked because work-hour limits are national. Without it there
 * is no honest limit to show, so the alternative to asking is showing
 * nothing. Note what is NOT asked: nothing here touches immigration status,
 * and the rules shown are attached to job types rather than to the person.
 */
export function StudentSetupForm({
  profile,
  countries,
}: {
  profile: CareerProfile | null;
  countries: SupportedStudentCountry[];
}) {
  const [state, formAction, pending] = useActionState(saveStudentProfileAction, initialState);
  const [country, setCountry] = useState(profile?.studentCountry ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="university">University</Label>
          <Input
            id="university"
            name="university"
            defaultValue={profile?.university ?? ""}
            placeholder="University of Manchester"
          />
          <p className="text-xs text-muted-foreground">
            Used to spot roles advertised by your own institution.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="major">Field of study</Label>
          <Input
            id="major"
            name="major"
            defaultValue={profile?.major ?? ""}
            placeholder="Computer Science"
          />
          <p className="text-xs text-muted-foreground">Used to rank internships.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expectedGraduation">Expected graduation</Label>
          <Input
            id="expectedGraduation"
            name="expectedGraduation"
            defaultValue={profile?.expectedGraduation ?? ""}
            placeholder="June 2028"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studentCountry">Where you study</Label>
          <input type="hidden" name="studentCountry" value={country ?? ""} />
          <Select value={country || undefined} onValueChange={setCountry}>
            <SelectTrigger id="studentCountry" className="w-full">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Work-hour rules differ by country, so Workly shows none until it knows which apply.
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.success && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
