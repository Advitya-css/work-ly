"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RunStudentDiscoveryButton } from "./run-student-discovery-button";

export function StudentAutoDiscoveryCard({ type }: { type: "part-time" | "internship" | "new-grad" }) {
  const titles = {
    "part-time": "Find local campus jobs",
    "internship": "Find summer internships",
    "new-grad": "Find new grad roles"
  };

  const descriptions = {
    "part-time": "Discover entry-level and campus roles tailored to your university.",
    "internship": "Discover summer internships and co-ops in your area.",
    "new-grad": "Discover early-career roles tailored for recent graduates."
  };

  return (
    <Card className="border-primary/20 bg-primary/5 mt-8 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="size-5" />
          {titles[type]}
        </CardTitle>
        <CardDescription>
          {descriptions[type]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <RunStudentDiscoveryButton type={type} />
      </CardContent>
    </Card>
  );
}
