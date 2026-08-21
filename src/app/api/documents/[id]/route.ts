import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

import { getCurrentUser } from "@/lib/auth";
import { deleteDocument, getDocumentById } from "@/lib/db/documents";
import { storageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/** Streams the original file back - only ever to the user who uploaded it. This is the one place a resume's bytes are ever served. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const document = await getDocumentById(user.id, id);
  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await storageProvider.download(document.storageKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[document.fileType],
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const document = await getDocumentById(user.id, id);
  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await storageProvider.delete(document.storageKey);
  await deleteDocument(id);
  return NextResponse.json({ ok: true });
}
