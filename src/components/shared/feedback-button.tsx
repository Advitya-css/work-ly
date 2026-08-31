"use client";

import { useState } from "react";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitFeedbackAction } from "@/lib/feedback/actions";
import { usePathname } from "next/navigation";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [type, setType] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    await submitFeedbackAction({ type, message, url: pathname });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setTimeout(() => {
        setSuccess(false);
        setMessage("");
      }, 300);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-5 left-4 md:left-[264px] h-12 w-12 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
        >
          <MessageSquare className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Beta Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Workly. Found a bug or have a suggestion? Let us know.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-success gap-3">
            <CheckCircle2 className="size-10" />
            <p className="font-medium text-foreground">Thanks for the feedback!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="What kind of feedback?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUG">Report a Bug</SelectItem>
                <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                <SelectItem value="GENERAL">General Feedback</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="What happened or what could be better?"
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading || !message.trim()} className="w-full">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
