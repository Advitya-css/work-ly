"use client";

/**
 * Printing (and so "Save as PDF") one document out of an app page: the
 * document is copied to the top of <body>, everything else is hidden for
 * the print, and it's removed again afterwards.
 */

const STYLE_ID = "workly-print-doc-style";
const ROOT_ID = "workly-print-doc";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { display: none; }
    @media print {
      @page { size: auto; margin: 0.75in; }
      body.printing-doc > *:not(#${ROOT_ID}) { display: none !important; }
      #${ROOT_ID} { display: block !important; color: #171717; background: #fff; }
    }`;
  document.head.appendChild(style);
}

export function printElement(node: HTMLElement, title: string) {
  ensureStyle();
  document.getElementById(ROOT_ID)?.remove();
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.appendChild(node);
  document.body.appendChild(root);
  document.body.classList.add("printing-doc");
  const previous = document.title;
  document.title = title.replace(/[\\/:*?"<>|]/g, "");
  const cleanup = () => {
    root.remove();
    document.body.classList.remove("printing-doc");
    document.title = previous;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // If a browser never fires afterprint, nothing is lost: the copy is hidden
  // on screen and replaced by the next print.
}

/** A letter as a printable page, built with text nodes only (no HTML from the letter is ever parsed). */
export function letterElement(letter: string, header: { name: string; contact: string }, date: string): HTMLElement {
  const page = document.createElement("div");
  page.style.cssText = "font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5;";
  const name = document.createElement("div");
  name.textContent = header.name || "Your Name";
  name.style.cssText = "font-size: 16pt; font-weight: 700;";
  page.appendChild(name);
  if (header.contact) {
    const contact = document.createElement("div");
    contact.textContent = header.contact;
    contact.style.cssText = "font-size: 9.5pt; color: #525252; padding-bottom: 8pt; border-bottom: 1px solid #a3a3a3; margin-bottom: 18pt;";
    page.appendChild(contact);
  }
  const when = document.createElement("p");
  when.textContent = date;
  when.style.cssText = "color: #525252; margin: 0 0 14pt;";
  page.appendChild(when);
  for (const block of letter.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    if (!block.trim()) continue;
    const p = document.createElement("p");
    p.style.cssText = "margin: 0 0 11pt; white-space: pre-line;";
    p.textContent = block.trim();
    page.appendChild(p);
  }
  return page;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, "");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function todayLong(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
