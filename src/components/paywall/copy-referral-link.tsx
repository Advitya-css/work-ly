"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full items-center gap-2">
      <Input readOnly value={link} className="bg-background text-muted-foreground" />
      <Button variant="secondary" onClick={handleCopy} className="shrink-0 w-24">
        {copied ? (
          <>
            <Check className="mr-2 size-4 text-success" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-2 size-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
