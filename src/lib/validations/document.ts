import type { DocumentType } from "@/lib/db/types";

export const MAX_RESUME_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const MIME_TO_TYPE: Record<string, DocumentType> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

const EXTENSION_TO_TYPE: Record<string, DocumentType> = {
  pdf: "PDF",
  docx: "DOCX",
};

export interface ResumeValidationResult {
  ok: boolean;
  fileType?: DocumentType;
  error?: string;
}

/** Validates by extension AND declared mime type - belt and suspenders, since browsers are inconsistent about the latter. */
export function validateResumeFile(file: { name: string; type: string; size: number }): ResumeValidationResult {
  if (file.size <= 0) {
    return { ok: false, error: "The file appears to be empty." };
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return { ok: false, error: `File is too large. The limit is ${MAX_RESUME_SIZE_BYTES / (1024 * 1024)}MB.` };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeFromExtension = EXTENSION_TO_TYPE[extension];
  const typeFromMime = MIME_TO_TYPE[file.type];

  const fileType = typeFromMime ?? typeFromExtension;
  if (!fileType) {
    return { ok: false, error: "Only PDF and DOCX files are supported." };
  }
  if (typeFromMime && typeFromExtension && typeFromMime !== typeFromExtension) {
    return { ok: false, error: "The file extension doesn't match its contents." };
  }

  return { ok: true, fileType };
}
