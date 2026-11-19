/**
 * Loads the real extension into Chromium and drives it against saved job
 * pages. The fixtures are hand-written, not scraped: what matters is the
 * shape real postings come in, a schema.org JobPosting block on one and
 * nothing but markup on the other.
 *
 *   node extension/test/run.cjs
 *
 * Checks the panel appears where a posting exists, stays away where one
 * does not, and that what the button hands to Work-ly decodes back to the
 * posting that was on the page.
 */
const path = require("node:path");
const fs = require("node:fs");
const https = require("node:https");
const { execFileSync } = require("node:child_process");
const { chromium } = require(process.env.WORKLY_PLAYWRIGHT || "/opt/npm-tools/node_modules/playwright");

const EXTENSION = path.resolve(__dirname, "..");
const FIXTURES = path.resolve(__dirname, "fixtures");
const PORT = 443;
// A content script only runs on the sites the manifest names, and only over
// https. So the fixtures are served over https under one of those names,
// resolved to this machine. file:// would need "allow access to file URLs",
// which is off by default and would not be testing what users install.
const HOST = "jobs.lever.co";
// The button opens Work-ly. Point that name here too, so the test can read
// the link the extension actually produced instead of reaching into the
// content script, which lives in its own isolated world and is not callable
// from the page.
const WORKLY = "work-ly.in";

function certificate() {
  const dir = fs.mkdtempSync("/tmp/workly-fixture-cert-");
  const key = path.join(dir, "key.pem");
  const cert = path.join(dir, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "2",
    "-subj", `/CN=${HOST}`,
    "-addext", `subjectAltName=DNS:${HOST},DNS:${WORKLY}`,
  ], { stdio: "ignore" });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

function serveFixtures() {
  const server = https.createServer(certificate(), (req, res) => {
    const name = path.basename((req.url || "/").split("?")[0]);
    const file = path.join(FIXTURES, name);
    if (!name.endsWith(".html") || !fs.existsSync(file)) {
      // Anything else is Work-ly's analyzer standing in for itself.
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<!doctype html><title>Work-ly</title><p>analyzer</p>");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

const url = (name) => `https://${HOST}/${name}`;

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ok  " : "FAIL  "}${name}${detail && !passed ? ` -> ${detail}` : ""}`);
}

/** The decoder from src/lib/capture/capture.ts, which is what has to read this. */
function decodeCapture(hash) {
  const match = /^#?capture=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  if (!match) return null;
  const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  return raw && typeof raw.text === "string" && raw.text.length >= 50 ? raw : null;
}

async function panelIn(page) {
  return page.evaluate(() => {
    const host = document.getElementById("workly-check-host");
    if (!host || !host.shadowRoot) return null;
    const title = host.shadowRoot.querySelector(".title");
    const meta = host.shadowRoot.querySelector(".meta");
    const cta = host.shadowRoot.querySelector(".cta");
    return { title: title?.textContent ?? "", meta: meta?.textContent ?? "", cta: cta?.textContent ?? "" };
  });
}

(async () => {
  const server = await serveFixtures();
  const context = await chromium.launchPersistentContext("", {
    executablePath: process.env.WORKLY_CHROMIUM || "/opt/pw-browsers/chromium",
    channel: "chromium",
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1, MAP ${WORKLY} 127.0.0.1`,
      "--ignore-certificate-errors",
      // This machine routes everything through an outbound proxy; the
      // fixture server is local and must not go near it.
      "--no-proxy-server",
    ],
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. A posting that only exists in the JSON-LD block.
  await page.goto(url("jsonld-job.html"));
  await page.waitForTimeout(1200);
  let panel = await panelIn(page);
  check("json-ld posting shows the panel", Boolean(panel), JSON.stringify(panel));
  check("json-ld title is read from the block", panel?.title === "Senior Data Analyst", panel?.title);
  check("json-ld employer is read from the block", panel?.meta === "Example Corp", panel?.meta);

  // 2. Press the button and read the link it opened: that link is the whole
  //    interface between the extension and Work-ly, and it has to survive
  //    Work-ly's own decoder.
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.evaluate(() => document.getElementById("workly-check-host").shadowRoot.querySelector(".cta").click()),
  ]);
  await popup.waitForLoadState("domcontentloaded").catch(() => {});
  const opened = new URL(popup.url());
  await popup.close();
  check("the button opens Work-ly's analyzer", opened.hostname === WORKLY && opened.pathname === "/analyze-job", popup.url().slice(0, 80));
  check(
    "the link is tagged so the extension is its own channel",
    opened.searchParams.get("utm_source") === "extension",
    opened.search,
  );
  const decoded = decodeCapture(opened.hash);
  check("the payload decodes with Work-ly's own decoder", Boolean(decoded), "decode returned null");
  check(
    "the description survives the round trip",
    Boolean(decoded && decoded.text.includes("Proficiency in SQL, Python, data modeling")),
    decoded && decoded.text.slice(0, 80),
  );
  check(
    "list items keep their bullets",
    Boolean(decoded && /- 4\+ years in analytics/.test(decoded.text)),
    decoded && decoded.text.slice(0, 120),
  );
  check("no html tags are carried through", Boolean(decoded && !/<[a-z]/i.test(decoded.text)), "tags found");

  // 3. A posting with no JSON-LD at all.
  await page.goto(url("dom-job.html"));
  await page.waitForTimeout(1200);
  panel = await panelIn(page);
  check("posting with no json-ld still shows the panel", Boolean(panel), JSON.stringify(panel));
  check("title comes from the page", panel?.title === "Analytics Engineer", panel?.title);
  check("employer comes from the page", panel?.meta === "Fixture Labs", panel?.meta);

  // 4. Not a job page.
  await page.goto(url("not-a-job.html"));
  await page.waitForTimeout(1200);
  panel = await panelIn(page);
  check("a page that is not a posting gets no panel", panel === null, JSON.stringify(panel));

  // 5. The panel must not be reachable from the host page's styles or scripts.
  await page.goto(url("dom-job.html"));
  await page.waitForTimeout(1200);
  const leaked = await page.evaluate(() => document.querySelector("#workly-check-host .cta") !== null);
  check("the panel is sealed inside its shadow root", leaked === false, "host page can reach the button");

  // 6. Dismissing it puts it away.
  await page.evaluate(() => document.getElementById("workly-check-host").shadowRoot.querySelector(".close").click());
  await page.waitForTimeout(200);
  check("dismiss removes the panel", (await panelIn(page)) === null);

  check("no page errors", errors.length === 0, errors.join(" | "));

  await context.close();
  server.close();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
