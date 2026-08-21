import { createHash } from "crypto";

import { sourceDefaults } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * MANUAL IMPORT.
 *
 * LEGAL BASIS: the user supplied the text themselves. This is the source
 * with the fewest questions attached, and it works with no credentials and
 * no network access.
 *
 * Accepts either one pasted posting or several separated by a line of
 * three or more dashes, which is the format people naturally use when
 * pasting a batch.
 */

const SEPARATOR = /^\s*-{3,}\s*$/m;

export const manualImportSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "MANUAL_IMPORT",
  id: "manual-import",
  name: "Pasted by you",
  legalBasis: "Supplied directly by the user. No third-party access of any kind.",

  isConfigured(config) {
    return typeof config.rawText === "string" && config.rawText.trim().length > 0;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const rawText = String(context.config.rawText ?? "").trim();
    if (!rawText) return [];

    const blocks = rawText
      .split(SEPARATOR)
      .map((block) => block.trim())
      .filter((block) => block.length >= 40);

    return blocks.slice(0, context.limit).map((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const labelled = (label: RegExp) => {
        const line = lines.find((l) => label.test(l));
        return line ? line.replace(label, "").trim() || null : null;
      };

      // The first non-empty line is the title unless a "Title:" label says
      // otherwise. Everything else is left for the shared normalizer's
      // heuristic extraction rather than guessed at here.
      const title = labelled(/^(?:job\s*title|position|role)\s*:/i) ?? lines[0] ?? "Untitled role";

      return {
        externalId: `manual:${createHash("sha1").update(block).digest("hex").slice(0, 16)}`,
        title: title.slice(0, 200),
        company: labelled(/^(?:company|employer|organisation|organization)\s*:/i),
        location: labelled(/^location\s*:/i),
        description: block,
        url: labelled(/^(?:url|link|source)\s*:/i),
        postedAt: null,
      };
    });
  },
};
