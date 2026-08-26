import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

export function TransitionRoadmap() {
  const steps = [
    { title: "Month 1: The Foundation", desc: "Lock down your post-grad Resume, scrub your LinkedIn, and build your target list of 30 companies.", done: true },
    { title: "Month 2: The Network", desc: "Send 10 cold emails a week to alumni at your target companies. Set up 4 informational interviews.", done: false },
    { title: "Month 3: The Pipeline", desc: "Apply to 15 'New Grad' or 'Early Career' specific pipelines. Practice your STAR interview answers in the Hot Seat.", done: false },
  ];

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>90-Day Transition Roadmap</CardTitle>
        <CardDescription>A tactical plan to secure your first full-time role.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            {step.done ? <CheckCircle2 className="size-5 text-primary shrink-0" /> : <Circle className="size-5 text-muted-foreground shrink-0" />}
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${step.done ? "text-foreground" : "text-foreground"}`}>{step.title}</span>
              <span className="text-xs text-muted-foreground">{step.desc}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
