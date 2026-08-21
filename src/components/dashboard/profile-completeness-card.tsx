import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { CareerProfile } from "@/lib/db/types";

const FIELDS: (keyof CareerProfile)[] = [
  "headline",
  "summary",
  "location",
  "currentRole",
  "currentCompany",
  "yearsExperience",
  "skills",
];

function completeness(profile: CareerProfile | null): number {
  if (!profile) return 0;
  const filled = FIELDS.filter((field) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== "";
  }).length;
  return Math.round((filled / FIELDS.length) * 100);
}

export function ProfileCompletenessCard({ profile }: { profile: CareerProfile | null }) {
  const percent = completeness(profile);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Career profile</CardTitle>
        <CardDescription>What Workly currently knows about you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{percent}% complete</span>
          </div>
          <Progress value={percent} label="Career profile completeness" />
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/career-profile">
            {profile ? "Update profile" : "Build your profile"}
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
