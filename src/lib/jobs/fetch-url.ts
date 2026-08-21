import "server-only";
import * as cheerio from "cheerio";

/**
 * Retrieves a publicly accessible job posting URL and extracts its visible
 * text. Deliberately minimal: a single plain, unauthenticated GET request
 * with a normal browser-like User-Agent - no headless browser, no CAPTCHA
 * solving, no cookie/session reuse, no bypassing login walls or bot
 * detection. If the page can't be retrieved this way (blocked, requires
 * login, renders via client-side JS with no server HTML, etc.), the caller
 * surfaces a clear message asking the user to paste the description
 * instead - per project scope, this app does not implement scraping.
 */
export interface FetchJobUrlResult {
  ok: boolean;
  text?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

export async function fetchJobPostingText(url: string): Promise<FetchJobUrlResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs are supported." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WorklyBot/1.0; +https://workly.example/about-fetching) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error:
          response.status === 401 || response.status === 403
            ? "That page requires sign-in or blocks automated requests. Please paste the job description instead."
            : `Couldn't retrieve that page (HTTP ${response.status}). Please paste the job description instead.`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { ok: false, error: "That URL didn't return a web page. Please paste the job description instead." };
    }

    const reader = response.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      // Cap how much we read - a job posting page is never multi-megabyte HTML.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          chunks.push(value);
          if (received > MAX_BYTES) {
            await reader.cancel();
            break;
          }
        }
      }
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");

    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, noscript, svg, iframe").remove();
    const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (text.length < 200) {
      return {
        ok: false,
        error:
          "That page didn't contain enough readable text. It may require JavaScript or a login to view. Please paste the job description instead.",
      };
    }

    return { ok: true, text: text.slice(0, 20000) };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: isAbort
        ? "That page took too long to respond. Please paste the job description instead."
        : "Couldn't retrieve that page. Please paste the job description instead.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
