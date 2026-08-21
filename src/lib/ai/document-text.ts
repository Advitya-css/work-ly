import "server-only";
import type { DocumentType } from "@/lib/db/types";

/** Extracts plain text from an uploaded resume file so it can be handed to a parser. */
export async function extractDocumentText(
  buffer: Buffer,
  fileType: DocumentType,
): Promise<string> {
  if (fileType === "PDF") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  // DOCX
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
