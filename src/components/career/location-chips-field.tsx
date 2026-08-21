"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_LOCATIONS = 10;

/**
 * "Willing to work in" is a list, not a sentence, so it is edited as chips:
 * type a place, press Enter, it becomes a removable tag. The old version of
 * this field was one comma-separated text input, which meant one stray
 * comma silently split "New York, NY" into two locations. Submits as
 * repeated hidden inputs under `name`, the same pattern the work-mode and
 * employment-type checkbox groups already use, so the server side only
 * needed `formData.getAll` to read it correctly.
 */
export function LocationChipsField({
  name,
  defaultValue = [],
  placeholder = "Add a city or region",
  id,
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  id?: string;
}) {
  const [locations, setLocations] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    setDraft("");
    if (!value) return;
    if (locations.length >= MAX_LOCATIONS) return;
    if (locations.some((l) => l.toLowerCase() === value.toLowerCase())) return;
    setLocations((current) => [...current, value]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && locations.length > 0) {
      setLocations((current) => current.slice(0, -1));
    }
  }

  function remove(value: string) {
    setLocations((current) => current.filter((l) => l !== value));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
        )}
      >
        {locations.map((location) => (
          <span
            key={location}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {location}
            <button
              type="button"
              onClick={() => remove(location)}
              aria-label={`Remove ${location}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={locations.length === 0 ? placeholder : ""}
          disabled={locations.length >= MAX_LOCATIONS}
          className="h-7 flex-1 min-w-[8rem] border-none px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter after each place. Up to {MAX_LOCATIONS}.</p>
      {locations.map((location) => (
        <input key={location} type="hidden" name={name} value={location} />
      ))}
    </div>
  );
}
