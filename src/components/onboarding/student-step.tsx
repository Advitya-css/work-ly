"use client";

import { useState } from "react";
import { GraduationCap, MapPin, BookOpen, Loader2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setupStudentProfileAction } from "@/lib/onboarding/actions";
import type { SupportedStudentCountry } from "@/lib/student/country-rules-db";

export function StudentStep({ countries }: { countries: SupportedStudentCountry[] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await setupStudentProfileAction(formData);
    if (result?.error) {
      alert(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md text-left">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Student Profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us where you study so we can instantly find local campus and part-time roles.
        </p>
      </div>

      <Card>
        <CardContent className="px-5 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="university" className="flex items-center gap-2">
                <GraduationCap className="size-4 text-muted-foreground" />
                University / College
              </Label>
              <Input
                id="university"
                name="university"
                placeholder="e.g. University of Toronto"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="major" className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                Major / Field of Study
              </Label>
              <Input
                id="major"
                name="major"
                placeholder="e.g. Computer Science"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="jobType" className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                Primary Goal
              </Label>
              <Select name="jobType" defaultValue="part-time" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part-time">Part-Time / Campus Jobs</SelectItem>
                  <SelectItem value="internship">Summer Internships</SelectItem>
                  <SelectItem value="new-grad">New Grad / Early Career</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="studentCountry" className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                Country of Study
              </Label>
              <Select name="studentCountry" required>
                <SelectTrigger id="studentCountry">
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
              <p className="text-xs text-muted-foreground mt-1">
                Required to ensure roles comply with local student visa hour limits.
              </p>
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
