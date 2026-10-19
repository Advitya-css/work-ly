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
