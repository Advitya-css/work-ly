import { placeMatches, remoteAllowsCountry, resolvePlace } from "@/lib/places";

/**
 * Whether a job's location satisfies a user's stated location preferences:
 * a home base, any other places they said they would work, and whether
 * remote counts.
 *
 * Deliberately forgiving in one direction. A job with no location text at
 * all passes, because Work-ly has no basis to say it does NOT match, only
 * that it cannot confirm it does, and hiding it would be a guess dressed up
 * as a filter. A job with a stated location that matches nothing the user
 * gave is the only case this excludes.
 *
 * Remote is a switch rather than an automatic pass. Someone who has said
 * they are not open to remote work does not want a filter called "match my
 * locations" quietly letting every remote job through.
 */

export interface LocationPreference {
  homeLocation: string | null;
  preferredLocations: string[];
  openToRemote: boolean;
}

export function matchesLocationPreference(
  jobLocation: string | null,
  workMode: string | null,
  preference: LocationPreference,
): boolean {
  const candidates = locationCandidates(preference.homeLocation, preference.preferredLocations);

  const isRemote = workMode === "REMOTE" || (jobLocation && jobLocation.toLowerCase().includes("remote"));
  if (isRemote && !preference.openToRemote) return false;
  // Remote, but only for people somewhere else ("USA, Canada", "Europe").
  if (isRemote && remoteAllowsCountry(jobLocation, null, candidates) === false) return false;
  if (workMode === "REMOTE") return true;
  if (candidates.length === 0) return true;
  if (!jobLocation?.trim()) return true;
  // "Remote" / "Anywhere (Remote)" with no place named: the user is open to remote, so it fits.
  if (isRemote) {
    const place = resolvePlace(jobLocation);
    if (place.cities.size === 0 && place.countries.size === 0) return true;
  }

  return candidates.some((candidate) => placeMatches(candidate, jobLocation));
}

/** Home base plus willing-to-work places, deduped. */
export function locationCandidates(
  homeLocation: string | null,
  preferredLocations: string[],
): string[] {
  const all = [homeLocation, ...preferredLocations].filter((v): v is string => Boolean(v?.trim()));
  return Array.from(new Set(all.map((v) => v.trim())));
}

/** True when there is anything at all to filter against. */
export function hasLocationPreference(preference: LocationPreference): boolean {
  return (
    locationCandidates(preference.homeLocation, preference.preferredLocations).length > 0 ||
    !preference.openToRemote
  );
}
