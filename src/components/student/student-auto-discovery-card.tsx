"use client";

import { Sparkles, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RunStudentDiscoveryButton } from "./run-student-discovery-button";

export function StudentAutoDiscoveryCard({ type }: { type: "part-time" | "internship" | "new-grad" }) {
  const titles = {
    "part-time": "Auto-Discover Off-Campus Jobs",
    "internship": "Auto-Discover Local Internships",
    "new-grad": "Auto-Discover New Grad Roles"
  };

  const descriptions = {
    "part-time": "We will trigger a full AI discovery run to find part-time, retail, and entry-level roles in your university's area. They will be parsed, scored, and added directly to your tracked pipeline.",
    "internship": "We will trigger a full AI discovery run to find summer and co-op internships near your university. They will be added directly to your tracked pipeline.",
    "new-grad": "We will trigger a full AI discovery run to find early-career and graduate programs near your university. They will be added directly to your tracked pipeline."
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
