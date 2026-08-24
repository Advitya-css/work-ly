import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deleteDocument, getDocumentById } from "@/lib/db/documents";
import { storageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/**
 * A user's original filename can contain characters a bare quoted-string
 * `filename="..."` can't carry (non-ASCII, or a literal `"`  which - if
 * only stripped rather than encoded - can still land oddly for names built
 * entirely of quotes). RFC 6266 fixes both: `filename` stays as a safe
 * ASCII-only fallback for old clients, and `filename*` carries the exact
 * name, percent-encoded per RFC 5987, for everything else.
 */
function contentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

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
      "Content-Disposition": contentDisposition(document.fileName),
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
