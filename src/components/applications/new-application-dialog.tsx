"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createManualApplicationAction } from "@/lib/applications/actions";
import { PIPELINE_COLUMNS, APPLICATION_STATUS_LABEL } from "@/lib/applications/labels";
import type { ApplicationStatus } from "@/lib/db/types";

/**
 * Logs a role applied to outside Work-ly. The tracker would be far less
 * useful if it only knew about jobs that happened to be analyzed here -
 * and the outcome analytics would be skewed toward them.
 */
export function NewApplicationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("APPLIED");
  const [isPartTime, setIsPartTime] = useState(false);

  function submit() {
    setError(null);
    startTransition(async () => {
      const finalRoleTitle = isPartTime ? `${roleTitle.trim()} (Part-Time)` : roleTitle.trim();
      const result = await createManualApplicationAction({
        roleTitle: finalRoleTitle,
        company,
        industry,
        location,
        status,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setRoleTitle("");
      setCompany("");
      setIndustry("");
      setLocation("");
      router.push(`/applications/${result.applicationId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Log an application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an application</DialogTitle>
          <DialogDescription>
            For roles you applied to outside Work-ly. Anything you analyzed here can be tracked
            straight from its opportunity page instead.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-app-role">Role title</Label>
            <Input
              id="new-app-role"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Product Analyst"
            />
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="new-app-pt" 
                checked={isPartTime} 
                onChange={(e) => setIsPartTime(e.target.checked)} 
                className="rounded border-gray-300"
              />
              <Label htmlFor="new-app-pt" className="text-xs font-normal">This is a part-time role</Label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-app-company">Company</Label>
              <Input id="new-app-company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-app-industry">Industry</Label>
              <Input
                id="new-app-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Software"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-app-location">Location</Label>
              <Input
                id="new-app-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_COLUMNS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPLICATION_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Starting further along the pipeline is fine. Work-ly backfills the stages you passed
            through so your interview rate stays accurate.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !roleTitle.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Add application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
