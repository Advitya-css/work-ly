import { describe, expect, it } from "vitest";

import { isUpsideDown, orderPdfText, pageEnds, type PdfPageTexts } from "@/lib/ai/pdf-order";

/** A page as the PDF reader reports it: one item per line, top to bottom on the page. */
const page = (lines: string[]): PdfPageTexts => ({
  Texts: lines.map((l, i) => ({ x: 2, y: 2 + i * 1.2, R: [{ T: encodeURIComponent(l) }] })),
});
/** The same page with one glyph per item, the way Chrome-made PDFs come through. */
const glyphPage = (lines: string[]): PdfPageTexts => ({
  Texts: lines.flatMap((l, i) => [...l.replace(/ /g, "")].map((ch, j) => ({ x: 2 + j * 0.4, y: 2 + i * 1.2, R: [{ T: encodeURIComponent(ch) }] }))),
});
const BREAK = (n: number) => `----------------Page (${n}) Break----------------`;

const P1 = ["Priya Raman", "EXPERIENCE", "Data Analyst, QuickBasket (2023 - present)", "Built 40+ dbt models on BigQuery.", "EDUCATION"];
const P2 = ["PROJECTS", "Delivery-fee experiment · lifted conversion 3.2%", "References on request"];

describe("PDF reading order", () => {
  it("turns a bottom-up page the right way up", () => {
    const raw = [...P1].reverse().join("\r\n") + `\r\n${BREAK(0)}\r\n`;
    expect(orderPdfText(raw, [page(P1)])).toBe(P1.join("\n"));
    expect(orderPdfText(raw, [glyphPage(P1)])).toBe(P1.join("\n"));
  });

  it("leaves a page that's already in order alone", () => {
    const raw = P1.join("\r\n") + `\r\n${BREAK(0)}\r\n`;
    expect(orderPdfText(raw, [page(P1)])).toBe(P1.join("\n"));
  });

  it("judges every page on its own and drops the page-break markers", () => {
    const raw = `${[...P1].reverse().join("\r\n")}\r\n${BREAK(0)}\r\n${P2.join("\r\n")}\r\n${BREAK(1)}\r\n`;
    const out = orderPdfText(raw, [page(P1), page(P2)]);
    expect(out).toBe(`${P1.join("\n")}\n\n${P2.join("\n")}`);
    expect(out).not.toMatch(/Break/);
  });

  it("keeps the reader's own order when it can't tell", () => {
    const raw = "Line B\r\nLine A\r\n";
    expect(orderPdfText(raw, [])).toBe("Line B\nLine A");
    expect(orderPdfText(raw, [{ Texts: [] }])).toBe("Line B\nLine A");
    // Top and bottom lines read the same: no evidence either way.
    expect(isUpsideDown(["Same", "Middle", "Same"], pageEnds(page(["Same", "Middle", "Same"])))).toBe(false);
    expect(pageEnds(page(["Only one line"]))).toBeNull();
  });

  it("copes with text it can't decode and with columns on one line", () => {
    const p: PdfPageTexts = {
      Texts: [
        { x: 2, y: 2, R: [{ T: "100%25 remote %E0%A4" }] },
        { x: 2, y: 9, R: [{ T: "Languages" }] },
        { x: 20, y: 9, R: [{ T: "Tools" }] },
      ],
    };
    expect(pageEnds(p)?.bottom).toBe("languagestools");
    expect(orderPdfText("Languages      Tools\r\nMiddle\r\n100% remote\r\n", [p])).toBe("100% remote\nMiddle\nLanguages      Tools");
  });
});
