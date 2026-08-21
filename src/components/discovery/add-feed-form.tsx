"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSourceAction } from "@/lib/discovery/actions";

export function AddFeedForm() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;

    setPending(true);
    const result = await addSourceAction({
      adapterId: "public-board-feed",
      name: "Custom RSS Feed",
      feedUrl: url.trim(),
    });
    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setUrl("");
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="w-full mt-4">
        <Plus className="mr-2 h-4 w-4" />
        Add RSS Feed
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 rounded-lg border p-3">
      <h4 className="text-sm font-medium">Add Public RSS Feed</h4>
      <Input
        placeholder="https://example.com/jobs/rss"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={pending}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !url.trim()}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Source
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
