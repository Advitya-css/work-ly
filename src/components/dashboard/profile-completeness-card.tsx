import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { ProfileCompleteness } from "@/lib/career/completeness";

export function ProfileCompletenessCard({ completeness }: { completeness: ProfileCompleteness }) {
  const percent = completeness.percentage;
  const topMissing = completeness.missing.slice(0, 3);

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
        {topMissing.length > 0 && (
          <ul className="flex flex-col gap-1">
            {topMissing.map((check) => (
              <li key={check.key} className="text-xs text-muted-foreground">
                • {check.hint}
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/career-profile">
            {percent > 0 ? "Update profile" : "Build your profile"}
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
