import type { TailoredResume } from "@/lib/resume/tailored-resume-core";

/**
 * The tailored resume as a real Word document. Many application portals
 * ask for .docx, and applicant-tracking systems read a plain, single-column
 * Word file more reliably than a printed PDF. So: one column, real bullet
 * lists, dates on a right tab stop, no tables, no text boxes.
 */

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const FONT = "Calibri";
const RIGHT_TAB = 10466; // content width in twentieths of a point (A4/Letter with ~0.7in margins)

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; caps?: boolean } = {}): string {
  const props = [
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`,
    opts.bold ? "<w:b/>" : "",
    opts.caps ? "<w:caps/>" : "",
    opts.color ? `<w:color w:val="${opts.color}"/>` : "",
    `<w:sz w:val="${opts.size ?? 21}"/>`,
  ].join("");
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(runs: string, opts: { after?: number; before?: number; tab?: boolean; bullet?: boolean; border?: boolean } = {}): string {
  const props = [
    opts.bullet ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>` : "",
    opts.border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="A3A3A3"/></w:pBdr>` : "",
    opts.tab ? `<w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}"/></w:tabs>` : "",
    `<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 40}" w:line="264" w:lineRule="auto"/>`,
  ].join("");
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`;
}

const TAB = "<w:r><w:tab/></w:r>";

function heading(text: string): string {
  return para(run(text, { bold: true, size: 19, color: "525252", caps: true }), { before: 200, after: 80, border: true });
}

export function resumeDocumentXml(
  resume: TailoredResume,
  fallback: { name: string; headline: string | null; contact: string },
): string {
  const name = resume.header?.name ?? fallback.name;
  const headline = resume.header?.headline ?? fallback.headline;
  const contact = resume.header?.contact ?? fallback.contact;
  const body: string[] = [];

  body.push(para(run(name || "Your Name", { bold: true, size: 36 }), { after: 20 }));
  if (headline) body.push(para(run(headline, { size: 22, color: "404040" }), { after: 20 }));
  if (contact) body.push(para(run(contact, { size: 19, color: "525252" }), { after: 120 }));

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
<w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/></w:rPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

/** Builds the .docx in the browser. JSZip is loaded only when someone asks for Word. */
export async function buildResumeDocx(
  resume: TailoredResume,
  fallback: { name: string; headline: string | null; contact: string },
): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/document.xml", resumeDocumentXml(resume, fallback));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
