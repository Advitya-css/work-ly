import "server-only";
import type { DocumentType } from "@/lib/db/types";
import { orderPdfText, type PdfPageTexts } from "@/lib/ai/pdf-order";

/** Extracts plain text from an uploaded resume file so it can be handed to a parser. */

export async function extractDocumentText(
  buffer: Buffer,
  fileType: DocumentType,
): Promise<string> {
  if (fileType === "PDF") {
    const PDFParser = (await import("pdf2json")).default;
    return new Promise((resolve, reject) => {
      // 1 flag means text only
      const pdfParser = new PDFParser(null, 1 as any);
      
      pdfParser.on("pdfParser_dataError", (errData) => reject((errData as any).parserError || errData));
      pdfParser.on("pdfParser_dataReady", (data) => {
        const text = pdfParser.getRawTextContent();
        // The raw text is often bottom-to-top within each page; put it back
        // in reading order (see lib/ai/pdf-order.ts).
        const pages = ((data as { Pages?: PdfPageTexts[] } | undefined)?.Pages ?? []) as PdfPageTexts[];
        try {
          resolve(orderPdfText(text, pages));
        } catch {
          resolve(text.replace(/\r\n/g, "\n"));
        }
      });
      
      pdfParser.parseBuffer(buffer);
    });
  }

  // DOCX
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
