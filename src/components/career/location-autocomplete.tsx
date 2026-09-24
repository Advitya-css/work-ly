"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { knownCity, normalizePlace } from "@/lib/places";

const VALID_LOCATIONS = [
  "New York, USA", "San Francisco, USA", "Los Angeles, USA", "Chicago, USA", "Boston, USA", "Seattle, USA", "Austin, USA", "United States",
  "Toronto, Canada", "Vancouver, Canada", "Montreal, Canada", "Calgary, Canada", "Ottawa, Canada", "Canada",
  "London, UK", "Manchester, UK", "Edinburgh, UK", "Birmingham, UK", "United Kingdom",
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia", "Perth, Australia", "Australia",
  "Bengaluru, India", "Mumbai, India", "Delhi NCR, India", "New Delhi, India", "Gurugram, India", "Noida, India", "Hyderabad, India", "Pune, India", "Chennai, India", "Kolkata, India", "Ahmedabad, India", "Kochi, India", "Thiruvananthapuram, India", "Jaipur, India", "Chandigarh, India", "Indore, India", "Coimbatore, India", "Mysuru, India", "Lucknow, India", "Bhubaneswar, India", "Goa, India", "India",
  "Dubai, UAE", "Abu Dhabi, UAE", "Dublin, Ireland",
  "Singapore",
  "Berlin, Germany", "Munich, Germany", "Hamburg, Germany", "Frankfurt, Germany", "Germany",
  "Paris, France", "Lyon, France", "France",
  "Amsterdam, Netherlands", "Rotterdam, Netherlands", "Netherlands",
  "Cape Town, South Africa", "Johannesburg, South Africa", "South Africa",
  "Auckland, New Zealand", "Wellington, New Zealand", "New Zealand",
  "Rome, Italy", "Milan, Italy", "Italy",
  "Madrid, Spain", "Barcelona, Spain", "Spain",
  "Warsaw, Poland", "Krakow, Poland", "Poland",
  "Sao Paulo, Brazil", "Rio de Janeiro, Brazil", "Brazil",
  "Mexico City, Mexico", "Guadalajara, Mexico", "Mexico",
  "Vienna, Austria", "Austria",
  "Zurich, Switzerland", "Geneva, Switzerland", "Switzerland",
  "Brussels, Belgium", "Belgium"
].sort();

export function LocationAutocomplete({ defaultValue, name, id, onChange }: { defaultValue: string; name: string; id: string; onChange?: (val: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Old and local names find the listed city too: "Bangalore" -> "Bengaluru, India", "Gurgaon" -> "Gurugram, India".
  const query = normalizePlace(value);
  const typedCity = value.trim().length >= 2 ? knownCity(value) : null;
  const filtered = VALID_LOCATIONS.filter(
    (l) => normalizePlace(l).includes(query) || (typedCity !== null && knownCity(l) === typedCity),
  );
  const exact = filtered.some((l) => normalizePlace(l) === query);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value); if(onChange) onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Toronto, Canada"
        autoComplete="off"
      />
      
      {open && value.trim().length > 0 && !exact && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            <ul className="py-1 text-sm">
              {filtered.map((loc) => (
                <li
                  key={loc}
                  onClick={() => {
                    setValue(loc); if(onChange) onChange(loc);
                    setOpen(false);
                  }}
                  className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                >
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {loc}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle className="size-5 text-amber-500" />
              <p className="font-medium text-foreground">We&apos;ll use &ldquo;{value.trim()}&rdquo; as written.</p>
              <p className="text-xs">
                It isn&apos;t in our city list yet, so matching falls back to the exact text. Adding the country (e.g. &ldquo;Surat, India&rdquo;) helps.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
