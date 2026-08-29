"use client";

import { useState } from "react";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSourceAction } from "@/lib/discovery/actions";

/**
 * Lets a student point Workly at their own university's public vacancies
 * feed. The backend already has a dedicated adapter for this (`kind:
 * "UNIVERSITY"`, id "university-feed" - see lib/discovery/sources/feeds.ts)
 * with its own legal basis, it just had no UI anywhere in the product.
 * This reuses the existing addSourceAction rather than adding a new path,
 * so it gets the same URL validation and status handling as every other
 * source.
 */
export function AddUniversityFeedForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;

    setPending(true);
    const result = await addSourceAction({
      adapterId: "university-feed",
      name: name.trim() || "University vacancies feed",
      feedUrl: url.trim(),
    });
    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setUrl("");
      setName("");
    }
  }

  if (success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-primary" />
        Added. Run Discover and roles from this feed will start showing up.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="university-feed-name">Feed name (optional)</Label>
        <Input
          id="university-feed-name"
          placeholder="e.g. University of Manchester Careers"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="university-feed-url">Vacancies feed URL</Label>
        <Input
          id="university-feed-url"
          placeholder="https://careers.youruniversity.edu/vacancies.rss"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending || !url.trim()} className="gap-2">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add feed
      </Button>
      {error && <p className="text-sm text-destructive sm:basis-full">{error}</p>}
    </form>
  );
}
