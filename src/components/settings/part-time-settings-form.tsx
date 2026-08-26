"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  savePartTimePreferencesAction,
  type PartTimeActionState,
} from "@/lib/settings/part-time-actions";
import type { CareerProfile } from "@/lib/db/types";

const initialState: PartTimeActionState = {};

export function PartTimeSettingsForm({ profile }: { profile: CareerProfile | null }) {
  const [state, action, isPending] = useActionState(savePartTimePreferencesAction, initialState);
  
  // Cast since we added these locally to types but they might not be generated yet
  
  const [isPartTimeMode, setIsPartTimeMode] = useState(profile?.isPartTimeMode ?? false);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="isPartTimeMode" className="text-base">
              Enable Part-Time Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Prioritize part-time roles, shift-based work, and hyper-local discovery.
            </p>
          </div>
          <Switch
            id="isPartTimeMode"
            name="isPartTimeMode"
            checked={isPartTimeMode}
            onCheckedChange={setIsPartTimeMode}
          />
        </div>

        {isPartTimeMode && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="availability">My Availability / Schedule</Label>
            <Input
              id="availability"
              name="availability"
              defaultValue={profile?.availability ?? ""}
              placeholder="e.g. Weekends only, Evenings after 5pm, MWF mornings"
            />
            <p className="text-xs text-muted-foreground">
              Workly will flag jobs that conflict with your availability.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-4">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.success && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> Saved
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
