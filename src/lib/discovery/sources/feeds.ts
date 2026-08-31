import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";
import { XMLParser } from "fast-xml-parser";

/**
 * FEED-BASED SOURCES - employer feeds, university vacancy feeds, and
 * public job boards that publish RSS/Atom.
 *
 * LEGAL BASIS: an RSS or Atom feed exists for exactly one reason - so
 * other software can read it. Publishing one is an explicit invitation to
 * consume it programmatically. This is categorically different from
 * scraping a site's HTML against its terms, which Work-ly does not do.
 *
 * The three adapters below share one parser and differ only in how they're
 * labelled, because the kind matters for provenance display and for the
 * legal basis recorded against the source - a university vacancy feed and
 * a commercial board's feed are the same technically but not editorially.
 */

interface FeedItem {
  title: string;
  link: string | null;
  description: string | null;
  pubDate: Date | null;
  guid: string | null;
}

function extractTag(block: string, tag: string): string | null {
  // Handles both <tag>value</tag> and <tag ...>value</tag>, plus CDATA.
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
  );
  if (!match) return null;
  return match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() || null;
}

function extractAtomLink(block: string): string | null {
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (href) return href[1];
  return extractTag(block, "link");
}

/**
 * Deliberately a small regex parser rather than an XML dependency. Job
 * feeds are shallow and well-formed enough that this is adequate, and it
 * keeps a parsing library - a common source of vulnerabilities when fed
 * untrusted XML - out of the dependency tree entirely. Anything it can't
 * read is skipped rather than guessed at.
 */
export function parseFeed(xml: string): FeedItem[] {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ];

  return blocks
    .map(([, block]) => {
      const title = extractTag(block, "title");
      if (!title) return null;
      return {
        title,
        link: extractAtomLink(block),
        description:
          extractTag(block, "description") ??
          extractTag(block, "content:encoded") ??
          extractTag(block, "content") ??
          extractTag(block, "summary"),
        pubDate: asDate(
          extractTag(block, "pubDate") ?? extractTag(block, "published") ?? extractTag(block, "updated"),
        ),
        guid: extractTag(block, "guid") ?? extractTag(block, "id"),
      } satisfies FeedItem;
    })
    .filter((item): item is FeedItem => item !== null);
}

function makeFeedAdapter(options: {
  kind: JobSourceAdapter["kind"];
  id: string;
  name: string;
  legalBasis: string;
  requires: string;
}): JobSourceAdapter {
  return {
    ...sourceDefaults,
    kind: options.kind,
    id: options.id,
    name: options.name,
    legalBasis: options.legalBasis,
    requires: options.requires,

    isConfigured(config) {
      const url = config.feedUrl;
      return typeof url === "string" && /^https?:\/\//i.test(url.trim());
    },

    async ingest(context: IngestContext): Promise<RawListing[]> {
      const feedUrl = String(context.config.feedUrl ?? "").trim();
      if (!feedUrl) return [];

      const defaultCompany = asString(context.config.company);
      const xml = await fetchWithGuards(feedUrl);
      const items = parseFeed(xml);

      return items.slice(0, context.limit).map((item, index) => ({
        externalId: `${options.id}:${item.guid ?? item.link ?? `${feedUrl}#${index}`}`,
        title: item.title,
        // Feeds rarely name the company separately - it's usually the feed
        // owner. Taken from config when the user supplied it, otherwise
        // left null rather than parsed out of the title on a guess.
        company: defaultCompany,
        location: null,
        description: item.description,
        url: item.link,
        postedAt: item.pubDate,
      }));
    },
  };
}

export const employerFeedSource = makeFeedAdapter({
  kind: "EMPLOYER_FEED",
  id: "employer-feed",
  name: "Employer careers feed",
  legalBasis:
    "An employer-published RSS/Atom careers feed. Publishing a feed is an explicit invitation for software to read it; this adapter does read-only requests at the interval the user configures.",
  requires: "The feed URL from the employer's careers page",
});

export const universitySource = makeFeedAdapter({
  kind: "UNIVERSITY",
  id: "university-feed",
  name: "University vacancies feed",
  legalBasis:
    "A university or research institution's published vacancies feed. Public-sector and academic institutions publish these for syndication; read-only consumption is the intended use.",
  requires: "The vacancies feed URL from the institution's HR pages",
});

export const publicJobBoardSource = makeFeedAdapter({
  kind: "PUBLIC_JOB_BOARD",
  id: "public-board-feed",
  name: "Public job board feed",
  legalBasis:
    "A job board's own published RSS/Atom feed, consumed read-only. Only boards that publish a feed or documented API are supported. Boards whose terms prohibit automated access are out of scope and have no adapter here.",
  requires: "The board's public feed URL",
});
