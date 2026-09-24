/**
 * Place matching that understands how people actually write places.
 *
 * Location checks used to be raw substring tests, so "Bangalore, India"
 * never matched a job in "Bengaluru, Karnataka", "Gurgaon" never matched
 * "Gurugram", and a word-overlap fallback let "Bangalore, India" match
 * every job in "Mumbai, India" because both contain "india". This module
 * resolves both sides to canonical cities, metro areas and countries first,
 * then compares those.
 *
 * Pure and dependency-free so the client-side opportunities filter and the
 * server-side fit scorers share one definition.
 */

interface CityInfo {
  country: string;
  aliases?: string[];
  /** Cities in one commuting area match each other ("Delhi NCR" covers Gurugram and Noida). */
  metro?: string;
}

const CITIES: Record<string, CityInfo> = {
  // India
  bengaluru: { country: "india", aliases: ["bangalore", "blr", "bangalore urban", "bengaluru urban"] },
  mumbai: { country: "india", aliases: ["bombay", "navi mumbai", "thane"], metro: "mumbai metropolitan region" },
  delhi: { country: "india", aliases: ["new delhi", "delhi ncr", "ncr", "national capital region"], metro: "delhi ncr" },
  gurugram: { country: "india", aliases: ["gurgaon"], metro: "delhi ncr" },
  noida: { country: "india", aliases: ["greater noida"], metro: "delhi ncr" },
  faridabad: { country: "india", metro: "delhi ncr" },
  ghaziabad: { country: "india", metro: "delhi ncr" },
  hyderabad: { country: "india", aliases: ["secunderabad", "hitec city", "hitech city"] },
  chennai: { country: "india", aliases: ["madras"] },
  kolkata: { country: "india", aliases: ["calcutta"] },
  pune: { country: "india", aliases: ["poona", "pimpri chinchwad"] },
  ahmedabad: { country: "india", aliases: ["gandhinagar"] },
  kochi: { country: "india", aliases: ["cochin", "ernakulam"] },
  thiruvananthapuram: { country: "india", aliases: ["trivandrum"] },
  jaipur: { country: "india" },
  chandigarh: { country: "india", aliases: ["mohali", "panchkula", "tricity"] },
  indore: { country: "india" },
  coimbatore: { country: "india" },
  mysuru: { country: "india", aliases: ["mysore"] },
  vadodara: { country: "india", aliases: ["baroda"] },
  lucknow: { country: "india" },
  bhubaneswar: { country: "india" },
  nagpur: { country: "india" },
  visakhapatnam: { country: "india", aliases: ["vizag"] },
  goa: { country: "india", aliases: ["panaji", "panjim"] },
  // United States
  "new york": { country: "united states", aliases: ["nyc", "new york city", "manhattan", "brooklyn"] },
  "san francisco": { country: "united states", aliases: ["sf", "san francisco bay area", "bay area"], metro: "bay area" },
  "san jose": { country: "united states", metro: "bay area" },
  "palo alto": { country: "united states", metro: "bay area" },
  "mountain view": { country: "united states", metro: "bay area" },
  sunnyvale: { country: "united states", metro: "bay area" },
  "menlo park": { country: "united states", metro: "bay area" },
  oakland: { country: "united states", metro: "bay area" },
  seattle: { country: "united states", metro: "seattle area" },
  redmond: { country: "united states", metro: "seattle area" },
  bellevue: { country: "united states", metro: "seattle area" },
  "los angeles": { country: "united states", aliases: ["la"] },
  boston: { country: "united states" },
  austin: { country: "united states" },
  chicago: { country: "united states" },
  "washington dc": { country: "united states", aliases: ["washington d c", "dc"] },
  denver: { country: "united states" },
  atlanta: { country: "united states" },
  miami: { country: "united states" },
  dallas: { country: "united states" },
  houston: { country: "united states" },
  // United Kingdom & Ireland
  london: { country: "united kingdom" },
  manchester: { country: "united kingdom" },
  edinburgh: { country: "united kingdom" },
  birmingham: { country: "united kingdom" },
  glasgow: { country: "united kingdom" },
  dublin: { country: "ireland" },
  // Canada
  toronto: { country: "canada", aliases: ["gta"] },
  vancouver: { country: "canada" },
  montreal: { country: "canada" },
  calgary: { country: "canada" },
  ottawa: { country: "canada" },
  waterloo: { country: "canada" },
  // Asia-Pacific & Middle East
  singapore: { country: "singapore" },
  sydney: { country: "australia" },
  melbourne: { country: "australia" },
  brisbane: { country: "australia" },
  perth: { country: "australia" },
  auckland: { country: "new zealand" },
  wellington: { country: "new zealand" },
  dubai: { country: "united arab emirates" },
  "abu dhabi": { country: "united arab emirates" },
  // Europe
  berlin: { country: "germany" },
  munich: { country: "germany", aliases: ["munchen"] },
  hamburg: { country: "germany" },
  frankfurt: { country: "germany" },
  amsterdam: { country: "netherlands" },
  rotterdam: { country: "netherlands" },
  paris: { country: "france" },
  lyon: { country: "france" },
  madrid: { country: "spain" },
  barcelona: { country: "spain" },
  milan: { country: "italy", aliases: ["milano"] },
  rome: { country: "italy", aliases: ["roma"] },
  warsaw: { country: "poland" },
  krakow: { country: "poland" },
  zurich: { country: "switzerland" },
  geneva: { country: "switzerland" },
  vienna: { country: "austria" },
  brussels: { country: "belgium" },
  lisbon: { country: "portugal" },
  stockholm: { country: "sweden" },
  copenhagen: { country: "denmark" },
};

/** Full country names and the multi-letter aliases safe to find inside free text. */
const COUNTRIES: Record<string, string[]> = {
  india: ["bharat"],
  "united states": ["usa", "united states of america"],
  "united kingdom": ["uk", "great britain", "britain", "england", "scotland"],
  canada: [],
  australia: [],
  "new zealand": [],
  singapore: [],
  germany: ["deutschland"],
  france: [],
  netherlands: ["the netherlands", "holland"],
  ireland: [],
  spain: [],
  italy: [],
  poland: [],
  switzerland: [],
  austria: [],
  belgium: [],
  portugal: [],
  sweden: [],
  denmark: [],
  "united arab emirates": ["uae"],
  "south africa": [],
  brazil: [],
  mexico: [],
};

/** Two-letter codes are only trusted as a whole comma-separated part ("Austin, US"), never inside prose ("in"). */
const COUNTRY_CODES: Record<string, string> = {
  in: "india",
  us: "united states",
  uk: "united kingdom",
  gb: "united kingdom",
  ca: "canada",
  au: "australia",
  nz: "new zealand",
  sg: "singapore",
  de: "germany",
  fr: "france",
  nl: "netherlands",
  ie: "ireland",
  ae: "united arab emirates",
};

export function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// alias -> canonical city, longest first so "new delhi" wins over "delhi"
const CITY_TERMS: [string, string][] = Object.entries(CITIES)
  .flatMap(([city, info]) => [[city, city] as [string, string], ...(info.aliases ?? []).map((a) => [a, city] as [string, string])])
  .sort((a, b) => b[0].length - a[0].length);
const COUNTRY_TERMS: [string, string][] = Object.entries(COUNTRIES)
  .flatMap(([country, aliases]) => [[country, country] as [string, string], ...aliases.map((a) => [a, country] as [string, string])])
  .sort((a, b) => b[0].length - a[0].length);

export interface ResolvedPlace {
  cities: Set<string>;
  metros: Set<string>;
  countries: Set<string>;
}

/** Cities, metro areas and countries named in a free-text location. */
export function resolvePlace(text: string | null | undefined): ResolvedPlace {
  const cities = new Set<string>();
  const metros = new Set<string>();
  const countries = new Set<string>();
  if (!text) return { cities, metros, countries };

  let padded = ` ${normalizePlace(text)} `;
  for (const [term, city] of CITY_TERMS) {
    if (padded.includes(` ${term} `)) {
      cities.add(city);
      const info = CITIES[city];
      countries.add(info.country);
      if (info.metro) metros.add(info.metro);
      padded = padded.split(` ${term} `).join(" ");
    }
  }
  for (const [term, country] of COUNTRY_TERMS) {
    if (padded.includes(` ${term} `)) countries.add(country);
  }
  for (const part of text.split(/[,|/()]/)) {
    const code = normalizePlace(part);
    if (COUNTRY_CODES[code]) countries.add(COUNTRY_CODES[code]);
  }
  return { cities, metros, countries };
}

/** Canonical display-independent key for a known city, or null. Used by the location picker to accept "Bengaluru" for "Bangalore". */
export function knownCity(text: string): string | null {
  const [first] = resolvePlace(text).cities;
  return first ?? null;
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

/**
 * Whether a job's location satisfies ONE place the user named.
 *
 * - A city preference matches the same city, anywhere in its metro area,
 *   or a job that only names the country (it might be there; nothing says
 *   it isn't).
 * - A country preference matches any job in that country.
 * - Places this module doesn't know fall back to careful text matching
 *   (containment either way), never to "they share the word India".
 */
export function placeMatches(
  preference: string | null | undefined,
  jobLocation: string | null | undefined,
  jobCountry?: string | null,
): boolean {
  if (!preference?.trim()) return false;
  const jobText = [jobLocation, jobCountry].filter(Boolean).join(", ");
  if (!jobText.trim()) return false;

  const want = resolvePlace(preference);
  const job = resolvePlace(jobText);

  if (want.cities.size > 0) {
    if (intersects(want.cities, job.cities) || intersects(want.metros, job.metros)) return true;
    if (job.cities.size === 0 && intersects(want.countries, job.countries)) return true;
    if (job.cities.size > 0) return false;
  } else if (want.countries.size > 0) {
    // "Surat, India": a city we don't know plus a country. Only that city's
    // text, or a job naming just the country, counts - not every city in India.
    const head = normalizePlace(preference.split(",")[0] ?? "");
    const headIsCountry = resolvePlace(head).countries.size > 0 && resolvePlace(head).cities.size === 0;
    if (!headIsCountry && head.length > 2) {
      if (` ${normalizePlace(jobText)} `.includes(` ${head} `)) return true;
      return job.cities.size === 0 && intersects(want.countries, job.countries);
    }
    if (intersects(want.countries, job.countries)) return true;
    if (job.cities.size > 0 || job.countries.size > 0) return false;
  }

  const p = normalizePlace(preference);
  const j = normalizePlace(jobText);
  if (!p || !j) return false;
  const firstPart = normalizePlace(preference.split(",")[0] ?? "");
  return j.includes(p) || p.includes(j) || (firstPart.length > 2 && ` ${j} `.includes(` ${firstPart} `));
}

const ASIA_PACIFIC = ["india", "singapore", "australia", "new zealand", "japan", "philippines", "indonesia", "malaysia", "vietnam", "thailand", "south korea", "pakistan", "bangladesh", "sri lanka"];
const EUROPE = ["united kingdom", "ireland", "germany", "france", "netherlands", "spain", "italy", "poland", "switzerland", "austria", "belgium", "portugal", "sweden", "denmark", "norway", "finland"];
const AMERICAS_NORTH = ["united states", "canada", "mexico"];
const LATAM = ["brazil", "mexico", "argentina", "colombia", "chile", "peru"];

const REGION_TERMS: [string, string[]][] = [
  ["asia pacific", ASIA_PACIFIC],
  ["apac", ASIA_PACIFIC],
  ["asia", ASIA_PACIFIC],
  ["emea", [...EUROPE, "united arab emirates", "south africa", "israel", "turkey"]],
  ["europe", EUROPE],
  ["eu", EUROPE],
  ["north america", AMERICAS_NORTH],
  ["northern america", AMERICAS_NORTH],
  ["usa timezones", AMERICAS_NORTH],
  ["us timezones", AMERICAS_NORTH],
  ["americas", [...AMERICAS_NORTH, ...LATAM]],
  ["latam", LATAM],
  ["latin america", LATAM],
  ["south america", LATAM],
  ["middle east", ["united arab emirates", "israel", "turkey"]],
];

/**
 * Does a REMOTE listing's location line let someone in one of these
 * countries apply? "Remote · USA, Canada" or "Europe" says no to someone in
 * India; "Worldwide" or "APAC" says yes. Null when the line says nothing
 * we can read - the caller treats that as unknown, not as a yes.
 */
export function remoteAllowsCountry(
  jobLocation: string | null | undefined,
  jobCountry: string | null | undefined,
  userCountries: string[],
): boolean | null {
  const wanted = new Set(userCountries.flatMap((c) => Array.from(resolvePlace(c).countries)));
  if (wanted.size === 0) return null;
  const text = ` ${normalizePlace([jobLocation, jobCountry].filter(Boolean).join(", "))} `;
  if (!text.trim()) return null;
  if (/ (worldwide|anywhere|global|globally|world wide) /.test(text)) return true;

  const allowed = new Set(resolvePlace([jobLocation, jobCountry].filter(Boolean).join(", ")).countries);
  for (const [term, countries] of REGION_TERMS) {
    if (text.includes(` ${term} `)) countries.forEach((c) => allowed.add(c));
  }
  if (allowed.size === 0) return null;
  for (const c of wanted) if (allowed.has(c)) return true;
  return false;
}

/** "Bengaluru, India" + "India" -> "Bengaluru, India"; "USA" + "USA" -> "USA". Joins location and country without saying the country twice. */
export function placeLine(location: string | null | undefined, country: string | null | undefined, separator = ", "): string {
  const loc = location?.trim() ?? "";
  const ctry = country?.trim() ?? "";
  if (!ctry) return loc;
  if (!loc) return ctry;
  const locCountries = resolvePlace(loc).countries;
  const ctryCountries = resolvePlace(ctry).countries;
  const same =
    normalizePlace(loc).includes(normalizePlace(ctry)) ||
    Array.from(ctryCountries).some((c) => locCountries.has(c));
  return same ? loc : `${loc}${separator}${ctry}`;
}
