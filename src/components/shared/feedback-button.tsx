"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitFeedbackAction } from "@/lib/feedback/actions";
import { usePathname } from "next/navigation";

/**
 * Telling us something is broken is a menu item, not a floating button.
 *
 * This used to be a second circle hovering over the bottom-left of every
 * screen, opposite Ask Work-ly. Two floating buttons on a phone cover the
 * end of whatever you were reading, and neither says what it is until you
 * tap it. It now lives under your name, next to Settings, where someone
 * looking for it would think to look.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [type, setType] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setSubmitError(null);
    const result = await submitFeedbackAction({ type, message, url: pathname });
    setLoading(false);
    if (result?.error) {
      setSubmitError("That didn't send. Please try again in a moment.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setSuccess(false);
        setMessage("");
      }, 300);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tell us what happened</DialogTitle>
          <DialogDescription>
            Something broken, something missing, or something you wish it did. A real person reads these.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-success">
            <CheckCircle2 className="size-10" />
            <p className="font-medium text-foreground">Thank you. That's with us.</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="What kind of feedback?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUG">Something is broken</SelectItem>
                <SelectItem value="FEATURE_REQUEST">Something is missing</SelectItem>
                <SelectItem value="GENERAL">Something else</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="What happened, or what could be better?"
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading || !message.trim()} className="w-full">
              {loading && <WorklyLoader className="mr-2 size-4 animate-spin" />}
              Send
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
