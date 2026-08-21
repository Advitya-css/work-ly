"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, AlertCircle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { validateResumeFile, MAX_RESUME_SIZE_BYTES } from "@/lib/validations/document";
import type { ParseDocumentResult } from "@/lib/career/parse-document";

type Status = "idle" | "dragover" | "uploading" | "parsing" | "success" | "error";

interface UploadResponse {
  document?: { id: string };
  error?: string;
}

function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as UploadResponse;
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error ?? `Upload failed (${xhr.status}).`));
      } catch {
        reject(new Error("Unexpected response from server."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: check your connection."));
    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export function ResumeUploader({
  onComplete,
}: {
  onComplete?: (result: ParseDocumentResult) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validation = validateResumeFile({ name: file.name, type: file.type, size: file.size });
    if (!validation.ok) {
      setError(validation.error ?? "This file can't be used.");
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setError(null);
    setStatus("uploading");
    setProgress(0);

    try {
      const { document, error: uploadError } = await uploadWithProgress(file, setProgress);
      if (!document) throw new Error(uploadError ?? "Upload failed.");

      setStatus("parsing");
      const parseResponse = await fetch(`/api/documents/${document.id}/parse`, { method: "POST" });
      const parseBody = await parseResponse.json();
      if (!parseResponse.ok) {
        throw new Error(parseBody.error ?? "Parsing failed.");
      }

      setStatus("success");
      onComplete?.(parseBody as ParseDocumentResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [onComplete]);

  function reset() {
    setStatus("idle");
    setError(null);
    setProgress(0);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const isBusy = status === "uploading" || status === "parsing";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isBusy && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !isBusy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isBusy) setStatus("dragover");
        }}
        onDragLeave={() => !isBusy && setStatus(fileName ? "idle" : "idle")}
        onDrop={(e) => {
          e.preventDefault();
          if (isBusy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          status === "dragover" && "border-primary bg-accent/40",
          status === "error" && "border-destructive/40 bg-destructive/5",
          status === "idle" && "border-border hover:border-foreground/30 hover:bg-secondary/50 cursor-pointer",
          isBusy && "border-border cursor-default",
          status === "success" && "border-success/40 bg-success/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {status === "idle" && (
          <>
            <div className="flex size-11 items-center justify-center rounded-lg bg-secondary">
              <UploadCloud className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drag and drop your resume, or{" "}
                <span className="text-primary underline underline-offset-2">browse files</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF or DOCX, up to {MAX_RESUME_SIZE_BYTES / (1024 * 1024)}MB
              </p>
            </div>
          </>
        )}

        {status === "dragover" && (
          <>
            <UploadCloud className="size-6 text-primary" strokeWidth={1.75} />
            <p className="text-sm font-medium text-primary">Drop to upload</p>
          </>
        )}

        {status === "uploading" && (
          <div className="w-full max-w-xs">
            <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <FileText className="size-4" />
              <span className="truncate">{fileName}</span>
            </div>
            <Progress value={progress} label="Upload progress" />
            <p className="mt-2 text-xs text-muted-foreground">Uploading, {progress}%</p>
          </div>
        )}

        {status === "parsing" && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Reading your resume…</p>
            <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-sm font-medium text-foreground">{fileName} processed</p>
          </div>
        )}
      </div>

      {status === "error" && error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle />
          <AlertDescription className="flex w-full items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              <X />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
