import { cleanStyle, type ResumeLayout, type TailoredResume } from "@/lib/resume/tailored-resume-core";

/**
 * The tailored resume as a real Word document. Many application portals
 * ask for .docx, and applicant-tracking systems read a plain, single-column
 * Word file more reliably than a printed PDF. So: one column, real bullet
 * lists, dates on a right tab stop, no tables, no text boxes.
 */

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The same three looks as the editor, in Word terms. */
const THEMES: Record<ResumeLayout, { font: string; heading: string; rule: string; name: string; center: boolean }> = {
  clean: { font: "Calibri", heading: "525252", rule: "A3A3A3", name: "171717", center: false },
  modern: { font: "Calibri", heading: "1F3A5F", rule: "8DA2BC", name: "1F3A5F", center: false },
  traditional: { font: "Georgia", heading: "171717", rule: "262626", name: "171717", center: true },
};
let FONT = "Calibri";
let BASE = 21; // half-points
const RIGHT_TAB = 10466; // content width in twentieths of a point (A4/Letter with ~0.7in margins)

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; caps?: boolean } = {}): string {
  const props = [
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`,
    opts.bold ? "<w:b/>" : "",
    opts.caps ? "<w:caps/>" : "",
    opts.color ? `<w:color w:val="${opts.color}"/>` : "",
    `<w:sz w:val="${opts.size ?? BASE}"/>`,
  ].join("");
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

let RULE = "A3A3A3";
let SPACING = 1;

function para(runs: string, opts: { after?: number; before?: number; tab?: boolean; bullet?: boolean; border?: boolean; center?: boolean } = {}): string {
  const props = [
    opts.bullet ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>` : "",
    opts.border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="${RULE}"/></w:pBdr>` : "",
    opts.tab ? `<w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}"/></w:tabs>` : "",
    `<w:spacing w:before="${Math.round((opts.before ?? 0) * SPACING)}" w:after="${Math.round((opts.after ?? 40) * SPACING)}" w:line="${SPACING < 1 ? 252 : 264}" w:lineRule="auto"/>`,
    opts.center ? `<w:jc w:val="center"/>` : "",
  ].join("");
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`;
}

const TAB = "<w:r><w:tab/></w:r>";

let HEADING = "525252";
function heading(text: string): string {
  return para(run(text, { bold: true, size: 19, color: HEADING, caps: true }), { before: 200, after: 80, border: true });
}

export function resumeDocumentXml(
  resume: TailoredResume,
  fallback: { name: string; headline: string | null; contact: string },
): string {
  const style = cleanStyle(resume.style);
  const theme = THEMES[style.layout];
  FONT = theme.font;
  HEADING = theme.heading;
  RULE = theme.rule;
  BASE = style.density === "compact" ? 20 : 21;
  SPACING = style.density === "compact" ? 0.7 : 1;
  const name = resume.header?.name ?? fallback.name;
  const headline = resume.header?.headline ?? fallback.headline;
  const contact = resume.header?.contact ?? fallback.contact;
  const body: string[] = [];
  const center = theme.center;

  body.push(para(run(name || "Your Name", { bold: style.layout !== "traditional", size: 36, color: theme.name }), { after: 20, center }));
  if (headline) body.push(para(run(headline, { size: 22, color: "404040" }), { after: 20, center }));
  if (contact) body.push(para(run(contact, { size: 19, color: "525252" }), { after: 120, center, border: center }));

  if (resume.summary) {
    body.push(heading("Summary"));
    body.push(para(run(resume.summary)));
  }

  if (resume.roles.length) {
    body.push(heading("Experience"));
    resume.roles.forEach((role, i) => {
      const left = run(role.title, { bold: true }) + run(` · ${role.company}`) + (role.location ? run(` · ${role.location}`, { color: "737373" }) : "");
      body.push(para(left + (role.dates ? TAB + run(role.dates, { size: 19, color: "525252" }) : ""), { tab: true, before: i === 0 ? 0 : 120, after: 40 }));
      role.bullets.filter(Boolean).forEach((b) => body.push(para(run(b), { bullet: true, after: 30 })));
    });
  }

  if (resume.projects.length) {
    body.push(heading("Projects"));
    resume.projects.forEach((p, i) => {
      body.push(para(run(p.name, { bold: true }), { before: i === 0 ? 0 : 100, after: 40 }));
      p.bullets.filter(Boolean).forEach((b) => body.push(para(run(b), { bullet: true, after: 30 })));
    });
  }

  if (resume.skills.length) {
    body.push(heading("Skills"));
    body.push(para(run(resume.skills.join(" · "))));
  }

  if (resume.education.length) {
    body.push(heading("Education"));
    resume.education.forEach((e) =>
      body.push(para(run(e.line) + (e.dates ? TAB + run(e.dates, { size: 19, color: "525252" }) : ""), { tab: true })),
    );
  }

  if (resume.certifications.length) {
    body.push(heading("Certifications"));
    body.push(para(run(resume.certifications.join(" · "))));
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="720" w:bottom="1000" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
<w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

async function packDocx(documentXml: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

/** Builds the .docx in the browser. JSZip is loaded only when someone asks for Word. */
export async function buildResumeDocx(
  resume: TailoredResume,
  fallback: { name: string; headline: string | null; contact: string },
): Promise<Blob> {
  return packDocx(resumeDocumentXml(resume, fallback));
}

/**
 * A cover letter as Word: the sender's name and contact line on top (the
 * same header as their resume), today's date, then the letter as written,
 * one paragraph per block of text.
 */
export function letterDocumentXml(letter: string, header: { name: string; contact: string }, date: string): string {
  FONT = "Calibri";
  BASE = 22;
  SPACING = 1;
  RULE = "A3A3A3";
  const body: string[] = [];
  body.push(para(run(header.name || "Your Name", { bold: true, size: 32 }), { after: 20 }));
  if (header.contact) body.push(para(run(header.contact, { size: 19, color: "525252" }), { after: 240, border: true }));
  body.push(para(run(date, { color: "525252" }), { after: 240 }));
  letter
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => {
      // Lines inside a block (a sign-off and name) stay on their own lines.
      const lines = block.split("\n");
      const runs = lines.map((line, i) => (i > 0 ? "<w:r><w:br/></w:r>" : "") + run(line)).join("");
      body.push(para(runs, { after: 200 }));
    });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1200" w:bottom="1300" w:left="1200" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
}

export async function buildLetterDocx(letter: string, header: { name: string; contact: string }, date: string): Promise<Blob> {
  return packDocx(letterDocumentXml(letter, header, date));
}
