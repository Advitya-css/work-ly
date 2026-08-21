"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { saveCareerProfileAction, type CareerActionState } from "@/lib/career/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { CareerProfile } from "@/lib/db/types";

const initialState: CareerActionState = {};

export function CareerProfileForm({ profile }: { profile: CareerProfile | null }) {
  const [state, formAction, pending] = useActionState(saveCareerProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Facts about you</CardTitle>
          <CardDescription>
            Everything here is entered by you directly. Workly never invents experience,
            skills, or achievements on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
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
              <Input
                id="location"
                name="location"
                defaultValue={profile?.location ?? ""}
                placeholder="Bengaluru, India"
              />
              <p className="text-xs text-muted-foreground">
                Anchors location matching on Opportunities and Discovery. Add other places you would also
                work on Career Goals.
              </p>
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
        </CardContent>
      </Card>

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
    </form>
  );
}
