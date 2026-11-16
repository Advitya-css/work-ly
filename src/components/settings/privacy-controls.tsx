"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteAccountAction,
  deleteCareerDataAction,
  deleteCvAction,
} from "@/lib/privacy/actions";

interface DangerActionProps {
  title: string;
  description: string;
  buttonLabel: string;
  confirmTitle: string;
  confirmBody: string;
  /** When set, the user must type this exactly before the action is allowed. */
  typeToConfirm?: string;
  onConfirm: () => Promise<{ error?: string; success?: string }>;
}

function DangerAction({
  title,
  description,
  buttonLabel,
  confirmTitle,
  confirmBody,
  typeToConfirm,
  onConfirm,
}: DangerActionProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);

  const canConfirm = !typeToConfirm || typed.trim() === typeToConfirm;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5"
          onClick={() => {
            setResult(null);
            setTyped("");
            setOpen(true);
          }}
        >
          <Trash2 />
          {buttonLabel}
        </Button>
      </div>

      {result?.success && (
        <Alert>
          <AlertDescription>{result.success}</AlertDescription>
        </Alert>
      )}
      {result?.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription>{confirmBody}</DialogDescription>
          </DialogHeader>

          {typeToConfirm && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-${typeToConfirm}`}>
                Type <span className="font-mono font-semibold">{typeToConfirm}</span> to confirm
              </Label>
              <Input
                id={`confirm-${typeToConfirm}`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !canConfirm}
              onClick={() =>
                startTransition(async () => {
                  const outcome = await onConfirm();
                  setResult(outcome);
                  setOpen(false);
                })
              }
            >
              {pending && <WorklyLoader className="animate-spin" />}
              {buttonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PrivacyControls() {
  return (
    <div className="flex flex-col gap-6">
      {/* Privacy & Data Protection */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data Protection</CardTitle>
          <CardDescription>How your career information and documents are protected.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Private & Confidential</p>
            <p>
              Your resumes, career history, and applications are private to your account. We never sell your data,
              share it with employers or recruiters, or use it for advertising.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Zero AI Model Training</p>
            <p>
              Your content is never used to train or improve AI models. Requests are processed on-demand over
              encrypted connections with zero data retention for training.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Full Ownership & Control</p>
            <p>
              You maintain complete ownership of your career data. You can download a full copy of your records
              or permanently delete your files and account at any time below.
            </p>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            For complete legal terms and our sub-processors list, view our{" "}
            <Link href="/legal/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/legal/subprocessors" className="text-foreground underline underline-offset-4 hover:text-primary">
              Sub-processors
            </Link>.
          </p>
        </CardContent>
      </Card>

      
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export your data</CardTitle>
          <CardDescription>
            Download a copy of your career profile, jobs, and application history as a JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/users/me/export" download>
              Download my data
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Deletion */}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delete your data</CardTitle>
          <CardDescription>
            These delete permanently and immediately. Files as well as database records. There is no
            recycle bin and no undo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DangerAction
            title="Delete uploaded CV files"
            description="Removes the PDF or DOCX files you uploaded, and the raw text extracted from them. Your career profile stays as it is."
            buttonLabel="Delete CV files"
            confirmTitle="Delete uploaded CV files?"
            confirmBody="Your uploaded files and the raw extraction stored from them will be permanently deleted. The career profile built from them. Your experience, skills and education ,  is not affected."
            onConfirm={deleteCvAction}
          />

          <DangerAction
            title="Delete all career data"
            description="Removes your career profile, goals, analyzed jobs, opportunities, dream jobs, pathways, applications and discovered listings. Your login stays."
            buttonLabel="Delete career data"
            confirmTitle="Delete all career data?"
            confirmBody="Everything Work-ly knows about your career will be permanently deleted, including your application history and its outcomes. Your account will remain, empty, as if newly created."
            typeToConfirm="DELETE DATA"
            onConfirm={deleteCareerDataAction}
          />

          <DangerAction
            title="Delete your account"
            description="Removes your account and everything attached to it, then signs you out."
            buttonLabel="Delete account"
            confirmTitle="Delete your account?"
            confirmBody="Your account, your uploaded files and all of your career data will be permanently deleted, and you will be signed out. This cannot be undone."
            typeToConfirm="DELETE ACCOUNT"
            onConfirm={deleteAccountAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
