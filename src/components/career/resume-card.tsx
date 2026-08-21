"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResumeUploader } from "@/components/career/resume-uploader";
import type { Document } from "@/lib/db/types";

const STATUS_META: Record<Document["status"], { icon: typeof CheckCircle2; label: string; className: string }> = {
  UPLOADED: { icon: Loader2, label: "Uploaded", className: "text-muted-foreground" },
  PARSING: { icon: Loader2, label: "Parsing…", className: "text-muted-foreground" },
  PARSED: { icon: CheckCircle2, label: "Parsed", className: "text-success" },
  FAILED: { icon: AlertCircle, label: "Failed to parse", className: "text-destructive" },
};

export function ResumeCard({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    setPendingDeleteId(id);
    startTransition(async () => {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setPendingDeleteId(null);
      router.refresh();
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Resume</CardTitle>
        <CardDescription>Upload a CV to build a first draft of your profile automatically.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ResumeUploader onComplete={() => router.refresh()} />

        {documents.length > 0 && (
          <ul className="flex flex-col gap-2">
            {documents.map((doc) => {
              const meta = STATUS_META[doc.status];
              const Icon = meta.icon;
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className={`flex items-center gap-1 text-xs ${meta.className}`}>
                        <Icon className={`size-3 ${doc.status === "PARSING" ? "animate-spin" : ""}`} />
                        {meta.label}
                        {doc.status === "FAILED" && doc.errorMessage ? `, ${doc.errorMessage}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingDeleteId === doc.id}
                    onClick={() => handleDelete(doc.id)}
                  >
                    {pendingDeleteId === doc.id ? "Removing…" : "Remove"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
