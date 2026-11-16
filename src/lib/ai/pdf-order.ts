/**
 * PUT A PDF'S LINES BACK IN READING ORDER - pure, so it can be tested.
 *
 * The PDF reader's plain-text output lists each page's lines bottom to top
 * for many real files (anything saved from Chrome, Google Docs and others):
 * a resume arrived with Education first and the person's name last, and
 * every bullet above the job it belongs to. The reader also reports where
 * each piece of text sits on the page, so this checks which end of its
 * output is really the top of the page and flips the page when it's upside
 * down. Pages it can't judge are left exactly as they were.
 */

export interface PdfPageTexts {
  Texts?: { x: number; y: number; R?: { T?: string }[] }[];
}

const BREAK = /-{6,}Page \(\d+\) Break-{6,}/;

function decode(t: string | undefined): string {
  if (!t) return "";
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** The text on the page's top line and bottom line, without spaces. */
export function pageEnds(page: PdfPageTexts): { top: string; bottom: string } | null {
  const items = (page.Texts ?? []).filter((t) => Number.isFinite(t.y) && Number.isFinite(t.x));
  if (items.length < 2) return null;
  const minY = Math.min(...items.map((t) => t.y));
  const maxY = Math.max(...items.map((t) => t.y));
  if (maxY - minY < 0.5) return null; // one line: nothing to order
  const line = (y: number) =>
    squash(
      items
        .filter((t) => Math.abs(t.y - y) < 0.2)
        .sort((a, b) => a.x - b.x)
        .map((t) => (t.R ?? []).map((r) => decode(r.T)).join(""))
        .join(""),
    );
  const top = line(minY);
  const bottom = line(maxY);
  return top && bottom && top !== bottom ? { top, bottom } : null;
}

/** Whether the reader listed this page bottom-up. */
export function isUpsideDown(lines: string[], ends: { top: string; bottom: string } | null): boolean {
  if (!ends) return false;
  const filled = lines.map(squash).filter(Boolean);
  if (filled.length < 2) return false;
  const first = filled[0];
  const last = filled[filled.length - 1];
  const starts = (line: string, key: string) => {
    const n = Math.min(10, line.length, key.length);
    return n >= 3 && line.slice(0, n) === key.slice(0, n);
  };
  const firstIsBottom = starts(first, ends.bottom) && !starts(first, ends.top);
  const lastIsTop = starts(last, ends.top) && !starts(last, ends.bottom);
  return firstIsBottom || lastIsTop;
}

/** The reader's raw text, with every upside-down page turned the right way up and page-break markers removed. */
export function orderPdfText(raw: string, pages: PdfPageTexts[]): string {
  const chunks = raw.replace(/\r\n/g, "\n").split(BREAK);
  const out: string[] = [];
  chunks.forEach((chunk, i) => {
    const lines = chunk.split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (!lines.length) return;
    const page = pages[i];
    out.push((page && isUpsideDown(lines, pageEnds(page)) ? [...lines].reverse() : lines).join("\n"));
  });
  return out.join("\n\n");
}
