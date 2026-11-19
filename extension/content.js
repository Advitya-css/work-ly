/**
 * THE BUTTON ON THE POSTING.
 *
 * Someone reading a job on LinkedIn has one question, and it is not "where
 * did I put that tab". So the question gets asked where they already are,
 * and the answer opens in Work-ly with the posting already filled in.
 *
 * Two deliberate choices:
 *
 *   The panel lives in a shadow root. LinkedIn's stylesheet cannot reach
 *   into it and ours cannot leak out, so the button looks the same on every
 *   site and nothing we do can break the page underneath.
 *
 *   The posting travels in the URL fragment, which browsers never send to
 *   a server. Nothing reaches Work-ly until the person looks at the
 *   prefilled form and presses Analyze. Same promise as the bookmarklet
 *   this replaces.
 */

(() => {
  const DEFAULT_ORIGIN = "https://work-ly.in";
  const HOST_ID = "workly-check-host";

  let origin = DEFAULT_ORIGIN;
  let lastUrl = location.href;
  let lastSignature = "";

  const PANEL_CSS = `
    :host { all: initial; }
    .panel {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483000;
      width: 268px;
      box-sizing: border-box;
      padding: 14px 16px 15px;
      border-radius: 14px;
      border: 1px solid rgba(28, 26, 25, 0.1);
      background: #fffdfb;
      color: #1c1a19;
      box-shadow: 0 18px 44px -18px rgba(28, 26, 25, 0.45);
      font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
      animation: rise 160ms ease-out;
    }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
    .row { display: flex; align-items: flex-start; gap: 9px; }
    .mark { flex: 0 0 auto; margin-top: 1px; color: #7a2e55; }
    .title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .meta { margin: 2px 0 0; font-size: 12px; color: #6b6360; }
    .cta {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 9px 12px;
      border: 0;
      border-radius: 9px;
      background: #7a2e55;
      color: #fffdfb;
      font: inherit;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .cta:hover { background: #68274799; background: #682747; }
    .cta:focus-visible { outline: 2px solid #7a2e55; outline-offset: 2px; }
    .note { margin: 9px 0 0; font-size: 11.5px; line-height: 1.4; color: #6b6360; }
    .close {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #6b6360;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
    }
    .close:hover { background: rgba(28, 26, 25, 0.06); }
    @media (prefers-color-scheme: dark) {
      .panel { background: #1c1a19; color: #f5f1ee; border-color: rgba(245, 241, 238, 0.14); }
      .meta, .note, .close { color: #a8a09c; }
      .mark { color: #d08cb0; }
      .close:hover { background: rgba(245, 241, 238, 0.08); }
    }
  `;

  const MARK = `<svg width="20" height="17" viewBox="0 0 34 28" aria-hidden="true">
    <path d="M2 8 L8 26 L13 13 L19 26 L30 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30.85 7.34 L30 2 L25.4 4.84" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // "Hide this" is remembered in the page's own sessionStorage, not in
  // extension storage: chrome.storage.session is closed to content scripts
  // unless the service worker opens it, and an unhandled rejection from it
  // shows up as an error in the host site's console, which is not something
  // to leave in somebody else's page.
  function dismissedKey(url) {
    return `workly:dismissed:${url}`;
  }

  function remember(url) {
    try {
      sessionStorage.setItem(dismissedKey(url), "1");
    } catch {
      // Private mode or a blocked origin: the panel comes back next time.
    }
  }

  function dismissed(url) {
    try {
      return sessionStorage.getItem(dismissedKey(url)) === "1";
    } catch {
      return false;
    }
  }

  function remove() {
    document.getElementById(HOST_ID)?.remove();
  }

  function open(job) {
    const link = `${origin}/analyze-job#capture=${window.__worklyExtract.encodeCapture(job)}`;
    // chrome.tabs needs a permission; a plain window.open does not, and the
    // user gesture is right here.
    window.open(link, "_blank", "noopener");
  }

  function render(job) {
    remove();
    const host = document.createElement("div");
    host.id = HOST_ID;
    const root = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PANEL_CSS;

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "complementary");
    panel.setAttribute("aria-label", "Work-ly");

    const close = document.createElement("button");
    close.className = "close";
    close.type = "button";
    close.setAttribute("aria-label", "Hide for this job");
    close.textContent = "×";

    const row = document.createElement("div");
    row.className = "row";
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.innerHTML = MARK;
    const text = document.createElement("div");
    const title = document.createElement("p");
    title.className = "title";
    title.textContent = job.title || "This job";
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = job.company || job.site;
    text.append(title, meta);
    row.append(mark, text);

    const cta = document.createElement("button");
    cta.className = "cta";
    cta.type = "button";
    cta.textContent = "Should I apply?";

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Opens in Work-ly with this posting filled in. Nothing is sent until you press Analyze.";

    panel.append(close, row, cta, note);
    root.append(style, panel);
    document.documentElement.append(host);

    cta.addEventListener("click", () => open(job));
    close.addEventListener("click", () => {
      remove();
      remember(job.url);
    });
  }

  function check() {
    const job = window.__worklyExtract.readJobPosting();
    if (!job) {
      remove();
      lastSignature = "";
      return;
    }
    // Re-rendering on every DOM mutation would make the panel flicker.
    const signature = `${job.url}|${job.title}|${job.text.length}`;
    if (signature === lastSignature) return;
    if (dismissed(job.url)) {
      remove();
      return;
    }
    lastSignature = signature;
    render(job);
  }

  function schedule() {
    clearTimeout(schedule.timer);
    schedule.timer = setTimeout(check, 400);
  }

  async function start() {
    const stored = await chrome.storage.sync.get("origin").catch(() => null);
    if (typeof stored?.origin === "string" && /^https?:\/\//.test(stored.origin)) origin = stored.origin;

    schedule();

    // LinkedIn and Naukri swap jobs without reloading the page, so neither
    // load nor popstate is enough on its own.
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastSignature = "";
      }
      schedule();
    }).observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("selectionchange", schedule);
  }

  start();
})();
