"use client";

import { useState, useEffect } from "react";
import { Loader2, Briefcase, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LiveStudentJobsFeed({ type }: { type: "part-time" | "internship" | "new-grad" }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`/api/student/live-jobs?type=${type}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [type]);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Scanning local area for live {type} roles...</p>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return null; // Don't show anything if no jobs found
  }

  const titles = {
    "part-time": "Local Off-Campus Jobs (Live Feed)",
    "internship": "Local Internships (Live Feed)",
    "new-grad": "New Grad & Entry-Level Roles (Live Feed)"
  };

  return (
    <Card className="border-primary/20 bg-primary/5 mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="size-5" />
          {titles[type]}
        </CardTitle>
        <CardDescription>
          Based on your university location, we found these live listings right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {jobs.map((job, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background rounded-lg border shadow-sm gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-foreground">{job.title || job.jobTitle}</h3>
              <p className="text-sm font-medium text-muted-foreground">{job.company || job.employer}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="size-3" />
                {job.location}
              </span>
            </div>
            <Button size="sm" variant="outline" asChild className="shrink-0 gap-2">
              <a href={job.url || job.applyUrl} target="_blank" rel="noreferrer">
                View & Apply
                <ExternalLink className="size-3" />
              </a>
            </Button>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Found a job you like? Add it to your board to start tracking it.</p>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/discover">Run Full Discovery</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
