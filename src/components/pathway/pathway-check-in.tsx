"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, X, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PathwayCheckInProps {
  pendingActionTitle?: string;
}

export function PathwayCheckIn({ pendingActionTitle }: PathwayCheckInProps) {
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "COMPLETED" | "SLIPPING">("IDLE");

  if (dismissed || !pendingActionTitle) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 mb-6 overflow-hidden">
      <CardContent className="p-4 sm:p-5 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2 size-6 text-muted-foreground hover:bg-black/5" 
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
        
        {status === "IDLE" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-medium">
              <CalendarClock className="size-4" />
              <span>Weekly Check-in</span>
            </div>
            <p className="text-sm text-foreground">
              You planned to work on <strong>{pendingActionTitle}</strong> this week. Are you still on track?
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button size="sm" onClick={() => setStatus("COMPLETED")} className="bg-primary hover:bg-primary/90">
                <CheckCircle2 className="size-4 mr-1.5" /> Yes, making progress
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("SLIPPING")}>
                <AlertCircle className="size-4 mr-1.5" /> Slipping / Need to adjust
              </Button>
            </div>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle2 className="size-4" />
            Great work! Keep the momentum going. Your pathway will automatically adjust as you check things off.
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
            <AlertCircle className="size-4" />
            No problem. We can adjust the plan. Take your time and check back when you're ready.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
