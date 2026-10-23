import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { writeFileSync } from "node:fs";

import { buildResumeDocx, resumeDocumentXml } from "../src/lib/resume/docx";

const resume = {
  summary: "Data Analyst with 3+ years in delivery analytics & experiments <dbt>.",
  roles: [
    { title: "Data Analyst", company: "QuickBite", location: "Bengaluru", dates: "Mar 2023 – Present", bullets: ["Built 40+ dbt models", ""] },
  ],
  projects: [],
  skills: ["SQL", "dbt"],
  education: [{ line: "B.Sc., Statistics — University of Pune", dates: "2021" }],
  certifications: [],
  keywordsCovered: [],
  keywordsMissing: [],
  unverifiedNumbers: [],
};
const who = { name: "Priya Sharma", headline: "Data Analyst", contact: "p@example.test" };

describe("Word resume", () => {
  it("escapes text and skips cleared lines", () => {
    const xml = resumeDocumentXml(resume, who);
    expect(xml).toContain("&amp; experiments &lt;dbt&gt;");
    expect(xml.match(/<w:numPr>/g)).toHaveLength(1);
  });
  it("is a valid package Word can open", async () => {
    const blob = await buildResumeDocx(resume, who);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/numbering.xml", "word/_rels/document.xml.rels"]),
    );
    if (process.env.DOCX_OUT) writeFileSync(process.env.DOCX_OUT, Buffer.from(await blob.arrayBuffer()));
  });
});

import { cleanStyle, estimatePages } from "../src/lib/resume/tailored-resume-core";

describe("resume looks", () => {
  it("carries the chosen layout into Word", () => {
    const xml = resumeDocumentXml({ ...resume, style: { layout: "traditional", density: "compact" } }, who);
    expect(xml).toContain('w:ascii="Georgia"');
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:sz w:val="20"/>');
    const clean = resumeDocumentXml(resume, who);
    expect(clean).toContain('w:ascii="Calibri"');
    expect(clean).not.toContain('<w:jc w:val="center"/>');
  });
  it("only accepts known styles", () => {
    expect(cleanStyle({ layout: "neon", density: "tiny" })).toEqual({ layout: "clean", density: "comfortable" });
    expect(cleanStyle({ layout: "modern", density: "compact" })).toEqual({ layout: "modern", density: "compact" });
  });
  it("estimates pages from the printed height", () => {
    expect(estimatePages(900, 720)).toBe(1);
    expect(estimatePages(965, 720)).toBe(1); // rounding, not a second page
    expect(estimatePages(1500, 720)).toBe(2);
    // Narrow phone sheet wraps more, so it's scaled back to print width.
    expect(estimatePages(1500, 342)).toBe(1);
  });
});
