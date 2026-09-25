"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
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
      {/* How data is processed. Plain language, no legalese */}
      <Card>
        <CardHeader>
          <CardTitle>
            How your data is handled
          </CardTitle>
          <CardDescription>Written plainly, because you should be able to check it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Where it lives</p>
            <p>
              Your career profile, jobs, analyses and applications are stored in the database this
              app is connected to. Uploaded CV files are stored outside the public web directory, so
              they are never served to anyone who simply knows a URL.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Who can see it</p>
            <p>
              Only your signed-in account. Every page and every action checks ownership before
              returning anything, so another account cannot reach your CV, profile or applications
              even with a direct link.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">What is sent to AI</p>
            <p>
              To read your CV, check your fit for a job and write tailored material, Work-ly sends the
              relevant text (your CV and profile, and the job posting) to Google&apos;s Gemini models.
              Only what a feature needs is sent, at the moment you use it or when your nightly job check
              runs. Work-ly never uses your data to train AI models. If the AI is unavailable, Work-ly falls back to built-in parsing and rules
              so you&apos;re never blocked.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">What Work-ly never does</p>
            <p>
              It does not scrape sites that prohibit it, does not sell or share your data, and does
              not estimate your chance of being hired. Every score is a stated-fact comparison, not
              a prediction about you.
            </p>
          </div>
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
