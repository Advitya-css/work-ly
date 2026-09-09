"use client";

import { useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

export function TypewriterMarkdown({ content, speed = 10 }: { content: string; speed?: number }) {
  const [displayedContent, setDisplayedContent] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedContent(content.substring(0, i));
      i++;
      if (i > content.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return <MarkdownRenderer content={displayedContent} />;
}
