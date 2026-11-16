import { NextResponse } from "next/server";

import { extractDocumentText } from "@/lib/ai/document-text";
import { checkRateLimit } from "@/lib/rate-limit";
import { MAX_RESUME_SIZE_BYTES, validateResumeFile } from "@/lib/validations/document";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * READ A RESUME FILE INTO TEXT, for the homepage check.
 *
 * "Paste your resume as text" asked a first-time visitor to open a PDF,
 * select all and copy - on a phone, most gave up there. This takes the PDF
 * or Word file, returns its text to the browser and keeps nothing: no
 * account, no storage, no AI call. The text then goes through the same
 * free check as pasted text (with its own limits).
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (!length) return NextResponse.json({ error: "No file was sent." }, { status: 411 });
  if (length > MAX_RESUME_SIZE_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "That file is too large. The limit is 8MB." }, { status: 413 });
  }

  // x-real-ip is set by the platform; the first x-forwarded-for entry is
  // whatever the client claimed.
  const ip =
    request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
  if (!(await checkRateLimit(`resume-text:${ip}`, 12, 60 * 60))) {
    return NextResponse.json({ error: "That's a lot of files in an hour. Paste the text instead, or try again later." }, { status: 429 });
  }

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Couldn't read that upload. Try again, or paste the text instead." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was sent." }, { status: 400 });

  const validation = validateResumeFile({ name: file.name, type: file.type, size: file.size });
  if (!validation.ok || !validation.fileType) {
    return NextResponse.json({ error: validation.error ?? "Only PDF and Word (.docx) files work here." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // The bytes have to be what the name says they are.
  const { fileTypeFromBuffer } = await import("file-type");
  const sniffed = await fileTypeFromBuffer(buffer);
  const ok =
    (validation.fileType === "PDF" && sniffed?.mime === "application/pdf") ||
    (validation.fileType === "DOCX" &&
      (sniffed?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || sniffed?.mime === "application/zip"));
  if (!ok) return NextResponse.json({ error: "That doesn't look like a real PDF or Word file." }, { status: 422 });

  try {
    const raw = await extractDocumentText(buffer, validation.fileType);
    const text = raw
      .replace(/-{3,}Page \(\d+\) Break-{3,}/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 20_000);
    if (text.length < 200) {
      return NextResponse.json(
        { error: "Couldn't find text in that file. It may be a scan or an image. Paste your resume as text instead." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text, words: text.split(/\s+/).length });
  } catch (error) {
    console.warn("[workly:resume-text] couldn't read a file:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't read that file. Paste your resume as text instead." }, { status: 422 });
  }
}
