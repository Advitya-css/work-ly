"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, Copy } from "lucide-react";

import { bookmarkletSource } from "@/lib/capture/capture";
import { Button } from "@/components/ui/button";

/**
 * The "Save to Work-ly" button for LinkedIn, Naukri and any other job page.
 *
 * React 19 refuses to render `javascript:` hrefs, so the link is given its
 * href directly on the DOM node after mount. The code only runs when the
 * user clicks the saved bookmark on a job page - never on Work-ly itself.
 */
export function CaptureBookmarklet() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const code = bookmarkletSource(window.location.origin);
    setSource(code);
    linkRef.current?.setAttribute("href", code);
  }, []);

  return (
    <details className="group rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bookmark className="size-4 text-muted-foreground" />
          Analyze jobs straight from LinkedIn or Naukri
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Drag the button to your bookmarks bar. On any job page, click it and the posting opens here, ready to analyze.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            ref={linkRef}
            draggable
            onClick={(e) => e.preventDefault()}
            className="inline-flex cursor-grab items-center gap-2 rounded-md border border-dashed border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary active:cursor-grabbing"
            title="Drag me to your bookmarks bar"
          >
            <Bookmark className="size-4" />
            Save to Work-ly
          </a>
          <span className="text-xs text-muted-foreground">← drag this to your bookmarks bar</span>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Open a job on LinkedIn, Naukri, Indeed, Instahyre or a company careers page.</li>
          <li>Click <span className="font-medium text-foreground">Save to Work-ly</span> in your bookmarks bar.</li>
          <li>Check the description and press Analyze. You get the full fit analysis and it&apos;s tracked automatically.</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Tip: if a page has a lot of other text, select just the job description first, then click the bookmark.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          disabled={!source}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(source);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Can't drag? Copy the bookmark code instead"}
        </Button>
      </div>
    </details>
  );
}
