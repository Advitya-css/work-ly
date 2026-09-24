"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy } from "lucide-react";

import { bookmarkletSource } from "@/lib/capture/capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="size-4" />
          Analyze jobs straight from LinkedIn or Naukri
        </CardTitle>
        <CardDescription>
          Drag the button below to your browser&apos;s bookmarks bar. On any job page, click it and the posting opens here,
          ready to analyze. It only reads the page you&apos;re looking at, and nothing is sent until you press Analyze.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
  );
}
