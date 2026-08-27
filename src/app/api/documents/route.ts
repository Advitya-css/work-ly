import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createDocument, listDocumentsByUserId } from "@/lib/db/documents";
import { checkRateLimit } from "@/lib/rate-limit";
import { storageProvider } from "@/lib/storage";
import { validateResumeFile } from "@/lib/validations/document";

export const runtime = "nodejs";

// A resume is never legitimately this big; rejecting on Content-Length
// before request.formData() runs means an oversized upload is refused
// without first buffering the whole body into memory to find that out.
const MAX_UPLOAD_REQUEST_BYTES = 15 * 1024 * 1024; // 15MB (form overhead + file)
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_SECONDS = 600;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await listDocumentsByUserId(user.id);
  return NextResponse.json({ documents });
}

/** Upload a resume (PDF/DOCX). Storing and validating happens here; parsing is a separate call - see [id]/parse/route.ts - so the client can show distinct "uploading" vs "parsing" states. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return NextResponse.json({ error: "Content-Length header is required." }, { status: 411 });
  }
  if (Number(contentLength) > MAX_UPLOAD_REQUEST_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  if (!(await checkRateLimit(`upload_${user.id}`, UPLOAD_LIMIT, UPLOAD_WINDOW_SECONDS))) {
    return NextResponse.json({ error: "Too many uploads recently. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const validation = validateResumeFile({ name: file.name, type: file.type, size: file.size });
  if (!validation.ok || !validation.fileType) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Defense in depth: confirm the bytes actually are what they claim to
  // be, not just trusting the extension/declared mime type.
  const { fileTypeFromBuffer } = await import("file-type");
  const sniffed = await fileTypeFromBuffer(buffer);
  const sniffedOk =
    (validation.fileType === "PDF" && sniffed?.mime === "application/pdf") ||
    (validation.fileType === "DOCX" &&
      (sniffed?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || sniffed?.mime === "application/zip"));
  if (!sniffedOk) {
    return NextResponse.json(
      { error: "The file's contents don't match a valid PDF or DOCX." },
      { status: 422 },
    );
  }

  const storageKey = `resumes/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await storageProvider.upload({
    key: storageKey,
    data: buffer,
    contentType: file.type || "application/octet-stream",
  });

  const document = await createDocument({
    userId: user.id,
    fileName: file.name,
    fileType: validation.fileType,
    fileSizeBytes: file.size,
    storageKey,
  });

  return NextResponse.json({ document });
}
