"use client";

import { useActionState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

import { saveCareerProfileAction, type CareerActionState } from "@/lib/career/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CareerProfile } from "@/lib/db/types";
import { LocationAutocomplete } from "@/components/career/location-autocomplete";

const initialState: CareerActionState = {};

export function CareerProfileForm({ profile }: { profile: CareerProfile | null }) {
  const [state, formAction, pending] = useActionState(saveCareerProfileAction, initialState);

  return (
    <form action={formAction}>
      {/* Folded once the basics are filled in: the hero above shows them. */}
      <details open={!profile?.headline && !profile?.currentRole} className="group rounded-xl border border-border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-base font-semibold text-foreground">Edit your basics</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid gap-5 border-t border-border px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                name="headline"
                defaultValue={profile?.headline ?? ""}
                placeholder="Senior Product Designer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Home location</Label>
              <LocationAutocomplete
                id="location"
                name="location"
                defaultValue={profile?.location ?? ""}
              />
              <p className="text-xs text-muted-foreground">Jobs are matched near here. Add other places in Goals.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentRole">Current role</Label>
              <Input
                id="currentRole"
                name="currentRole"
                defaultValue={profile?.currentRole ?? ""}
                placeholder="Product Designer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentCompany">Current company</Label>
              <Input
                id="currentCompany"
                name="currentCompany"
                defaultValue={profile?.currentCompany ?? ""}
                placeholder="Acme Inc."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                name="yearsExperience"
                type="number"
                min={0}
                max={60}
                defaultValue={profile?.yearsExperience ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={4}
              defaultValue={profile?.summary ?? ""}
              placeholder="A brief summary of your background, in your own words."
            />
          </div>

          {/* Free-text skills are superseded by the structured Skills section below , 
              kept as a hidden empty field so the deprecated column is cleared, not left stale. */}
          <input type="hidden" name="skills" value="" />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {state.success && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Saved
          </span>
        )}
      </div>
        </div>
      </details>
    </form>
  );
}
