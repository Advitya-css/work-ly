/**
 * READING THE POSTING OFF THE PAGE.
 *
 * Three sources, in order of how long they survive a redesign:
 *
 *   1. JSON-LD. LinkedIn, Naukri, Indeed and most applicant tracking
 *      systems embed a schema.org JobPosting block for Google Jobs. It
 *      carries the title, the employer and the full description, and it
 *      does not change when the design does, which is what breaks every
 *      selector-based scraper every few months.
 *   2. Selectors, for pages with no JSON-LD.
 *   3. Whatever the person has selected with the mouse, which always wins
 *      when it is long enough to be a description: if they highlighted it,
 *      they meant it.
 *
 * Nothing here talks to the network. It reads the page the person is
 * already looking at, the same text they could select and copy.
 */

(() => {
  const MAX_TEXT = 15000;

  /** schema.org allows a string, an object, or an array for almost every field. */
  function firstString(value, max) {
    if (typeof value === "string") return value.trim().slice(0, max);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = firstString(item, max);
        if (found) return found;
      }
      return "";
    }
    if (value && typeof value === "object") return firstString(value.name ?? value["@value"], max);
    return "";
  }

  /** JobPosting.description is HTML. Turn it into the text a person would read. */
  const LOOKS_LIKE_MARKUP = /<\/?[a-z][a-z0-9]*[^<>]*>/i;

  function stripOnce(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
    doc.querySelectorAll("li").forEach((li) => li.insertAdjacentText("afterbegin", "- "));
    doc.querySelectorAll("br,p,div,li,h1,h2,h3,h4,tr").forEach((n) => n.insertAdjacentText("beforeend", "\n"));
    return doc.body.textContent || "";
  }

  function htmlToText(html) {
    if (typeof html !== "string" || !html) return "";
    if (!/[<&]/.test(html)) return html.trim();
    let text = stripOnce(html);
    // Some boards escape their markup twice, so one pass turns &lt;p&gt;
    // into a literal "<p>" sitting in the text rather than into a
    // paragraph. One more pass, and only one, finishes the job.
    if (LOOKS_LIKE_MARKUP.test(text)) text = stripOnce(text);
    return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  }

  /** Every JSON-LD node on the page, flattened through @graph and arrays. */
  function jsonLdNodes() {
    const nodes = [];
    for (const tag of document.querySelectorAll('script[type="application/ld+json"]')) {
      let parsed;
      try {
        parsed = JSON.parse(tag.textContent || "");
      } catch {
        continue; // A malformed block on the page is not our problem to report.
      }
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
        nodes.push(node);
      }
    }
    return nodes;
  }

  function fromJsonLd() {
    for (const node of jsonLdNodes()) {
      const type = node["@type"];
      const isJob = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
      if (!isJob) continue;
      const text = htmlToText(node.description).slice(0, MAX_TEXT);
      if (text.length < 120) continue; // A stub block with no description is no better than the DOM.
      return {
        title: firstString(node.title, 200),
        company: firstString(node.hiringOrganization, 200),
        text,
        source: "json-ld",
      };
    }
    return null;
  }

  const DESCRIPTION_SELECTORS = [
    "#job-details",
    ".jobs-description__content",
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".show-more-less-html__markup",
    ".description__text",
    "#jobDescriptionText",
    '[class*="styles_JDC__dang"]',
    '[class*="job-desc"]',
    '[class*="jobDescription"]',
    '[data-testid*="description"]',
    ".posting-page .section-wrapper",
    ".job__description",
    '[class*="description"]',
    "article",
    "main",
  ];

  const TITLE_SELECTORS = [
    ".job-details-jobs-unified-top-card__job-title",
    ".top-card-layout__title",
    '[class*="jd-header-title"]',
    '[class*="styles_jd-header-title"]',
    ".posting-headline h2",
    ".job__title h1",
    "h1",
  ];

  const COMPANY_SELECTORS = [
    ".job-details-jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    '[class*="jd-header-comp-name"]',
    '[data-testid*="company"]',
    '[class*="company-name"]',
    '[data-company-name]',
  ];

  function pick(selectors, minLength) {
    for (const selector of selectors) {
      let element;
      try {
        element = document.querySelector(selector);
      } catch {
        continue; // A selector this browser dislikes should not stop the rest.
      }
      const text = element && (element.innerText || element.textContent || "").trim();
      if (text && text.length >= minLength) return text;
    }
    return "";
  }

  function fromDom() {
    const text = pick(DESCRIPTION_SELECTORS, 200);
    if (!text) return null;
    return {
      title: (pick(TITLE_SELECTORS, 2) || document.title).split("\n")[0].slice(0, 200),
      company: pick(COMPANY_SELECTORS, 2).split("\n")[0].slice(0, 200),
      text: text.slice(0, MAX_TEXT),
      source: "page",
    };
  }

  function fromSelection() {
    const selected = String(window.getSelection() || "").trim();
    if (selected.length < 400) return null;
    return {
      title: (pick(TITLE_SELECTORS, 2) || document.title).split("\n")[0].slice(0, 200),
      company: pick(COMPANY_SELECTORS, 2).split("\n")[0].slice(0, 200),
      text: selected.slice(0, MAX_TEXT),
      source: "selection",
    };
  }

  /** The posting on this page, or null when this isn't one. */
  function readJobPosting() {
    const found = fromSelection() || fromJsonLd() || fromDom();
    if (!found || found.text.length < 200) return null;
    return {
      ...found,
      title: found.title || document.title.split("|")[0].trim().slice(0, 200),
      url: location.href.split("#")[0].slice(0, 1500),
      site: location.hostname.replace(/^www\./, ""),
    };
  }

  /** Base64url of UTF-8 JSON, matching decodeCapture in src/lib/capture/capture.ts. */
  function encodeCapture(job) {
    const payload = JSON.stringify({
      v: 1,
      title: job.title,
      company: job.company,
      text: job.text,
      url: job.url,
      site: job.site,
    });
    const bytes = new TextEncoder().encode(payload);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  window.__worklyExtract = { readJobPosting, encodeCapture, htmlToText };
})();
