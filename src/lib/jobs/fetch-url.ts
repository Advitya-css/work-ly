import "server-only";
import * as cheerio from "cheerio";
import { isSafeUrl } from "@/lib/ssrf";

export interface FetchJobUrlResult {
  ok: boolean;
  text?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_REDIRECTS = 5;

export async function fetchJobPostingText(url: string): Promise<FetchJobUrlResult> {
  let currentUrl = url;
  let redirectCount = 0;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        return { ok: false, error: "That doesn't look like a valid URL." };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "Only http(s) URLs are supported." };
      }

      const safe = await isSafeUrl(parsed.toString());
      if (!safe) {
        return { ok: false, error: "That URL is not allowed (internal or private IP blocked)." };
      }

      const response = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WorklyBot/1.0; +https://workly.example/about-fetching) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, error: "Redirected without a location header." };
        }
        // Handle relative redirects
        try {
          currentUrl = new URL(location, currentUrl).toString();
        } catch {
          return { ok: false, error: "Invalid redirect location." };
        }
        redirectCount++;
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          error: response.status === 401 || response.status === 403
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
          error: "That page didn't contain enough readable text. It may require JavaScript or a login to view. Please paste the job description instead.",
        };
      }

      return { ok: true, text: text.slice(0, 20000) };
    }
    
    return { ok: false, error: "Too many redirects." };
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
