"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LocationChipsField } from "@/components/career/location-chips-field";
import {
  saveLocationPreferencesAction,
  type LocationActionState,
} from "@/lib/settings/location-actions";
import type { CareerProfile } from "@/lib/db/types";

const initialState: LocationActionState = {};

/**
 * Home base, anywhere else you would go, and whether remote counts.
 *
 * Split into three controls rather than one list because they answer
 * different questions. Home is where you are now and anchors everything.
 * The list is what you are willing to change. Remote is a yes or no that
 * makes the other two mostly irrelevant when it is on, which is exactly why
 * it deserves to be its own switch instead of the word "Remote" typed into
 * a list of cities.
 */
export function LocationSettingsForm({ profile }: { profile: CareerProfile | null }) {
  const [state, formAction, pending] = useActionState(saveLocationPreferencesAction, initialState);
  const [openToRemote, setOpenToRemote] = useState(profile?.openToRemote ?? true);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-location">Where you are now</Label>
        <Input
          id="settings-location"
          name="location"
          defaultValue={profile?.location ?? ""}
          placeholder="Manchester, United Kingdom"
        />
        <p className="text-xs text-muted-foreground">
          Anchors location matching everywhere in Workly.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-preferred-locations">Anywhere else you would work</Label>
        <LocationChipsField
          id="settings-preferred-locations"
          name="preferredLocations"
          placeholder="Add a city or region"
          defaultValue={profile?.preferredLocations ?? []}
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3.5">
        <div>
          <Label htmlFor="settings-remote" className="font-medium">
            Open to remote work
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When this is on, a remote role always counts as matching your locations, wherever it is
            based.
          </p>
        </div>
        <input type="hidden" name="openToRemote" value={openToRemote ? "true" : "false"} />
        <Switch
          id="settings-remote"
          checked={openToRemote}
          onCheckedChange={setOpenToRemote}
          aria-label="Open to remote work"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save locations"}
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
