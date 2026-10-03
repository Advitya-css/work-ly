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
  /**
   * For metros too big to commute across (the Bay Area: San Jose to San
   * Francisco is over an hour), the parts of it a city belongs to. Two
   * cities in the same metro only match when they share a part; a place
   * that names the whole metro ("Bay Area") matches all of it.
   */
  areas?: string[];
  /** US state, for the location picker's label ("San Jose, CA, USA"). */
  state?: string;
  /** How the picker shows the city, when plain title case is wrong. */
  label?: string;
}

const CITIES: Record<string, CityInfo> = {
  // India
  bengaluru: { country: "india", aliases: ["bangalore", "blr", "bangalore urban", "bengaluru urban", "banglore", "benglaruru", "benguluru", "bangalor"] },
  mumbai: { country: "india", aliases: ["bombay", "navi mumbai", "thane", "mubai", "bumbai"], metro: "mumbai metropolitan region" },
  delhi: { country: "india", aliases: ["new delhi", "delhi ncr", "ncr", "national capital region", "dilli", "ndls"], metro: "delhi ncr" },
  gurugram: { country: "india", aliases: ["gurgaon", "gurgoan"], metro: "delhi ncr" },
  noida: { country: "india", aliases: ["greater noida"], metro: "delhi ncr" },
  faridabad: { country: "india", metro: "delhi ncr" },
  ghaziabad: { country: "india", metro: "delhi ncr" },
  hyderabad: { country: "india", aliases: ["secunderabad", "hitec city", "hitech city", "hyderbad"] },
  chennai: { country: "india", aliases: ["madras", "chenai"] },
  kolkata: { country: "india", aliases: ["calcutta"] },
  pune: { country: "india", aliases: ["poona", "pimpri chinchwad", "pune city"] },
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
  "new york": { country: "united states", state: "NY", aliases: ["nyc", "new york city", "manhattan", "brooklyn", "queens"], metro: "new york area" },
  "jersey city": { country: "united states", state: "NJ", metro: "new york area" },
  hoboken: { country: "united states", state: "NJ", metro: "new york area" },
  "bay area": { country: "united states", aliases: ["san francisco bay area", "sf bay area", "silicon valley"], metro: "bay area", label: "San Francisco Bay Area, CA, USA" },
  "san francisco": { country: "united states", state: "CA", aliases: ["sf"], metro: "bay area", areas: ["sf", "peninsula"] },
  "south san francisco": { country: "united states", state: "CA", metro: "bay area", areas: ["sf", "peninsula"] },
  oakland: { country: "united states", state: "CA", metro: "bay area", areas: ["sf", "east bay"] },
  berkeley: { country: "united states", state: "CA", metro: "bay area", areas: ["sf", "east bay"] },
  emeryville: { country: "united states", state: "CA", metro: "bay area", areas: ["sf", "east bay"] },
  "san mateo": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula"] },
  "redwood city": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula"] },
  "foster city": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula"] },
  "menlo park": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula", "south bay"] },
  "palo alto": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula", "south bay"] },
  "mountain view": { country: "united states", state: "CA", metro: "bay area", areas: ["peninsula", "south bay"] },
  sunnyvale: { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  "santa clara": { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  "san jose": { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  cupertino: { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  milpitas: { country: "united states", state: "CA", metro: "bay area", areas: ["south bay", "east bay"] },
  campbell: { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  "los gatos": { country: "united states", state: "CA", metro: "bay area", areas: ["south bay"] },
  fremont: { country: "united states", state: "CA", metro: "bay area", areas: ["south bay", "east bay"] },
  pleasanton: { country: "united states", state: "CA", metro: "bay area", areas: ["east bay"] },
  "walnut creek": { country: "united states", state: "CA", metro: "bay area", areas: ["east bay"] },
  hayward: { country: "united states", state: "CA", metro: "bay area", areas: ["east bay"] },
  seattle: { country: "united states", state: "WA", metro: "seattle area" },
  redmond: { country: "united states", state: "WA", metro: "seattle area" },
  bellevue: { country: "united states", state: "WA", metro: "seattle area" },
  kirkland: { country: "united states", state: "WA", metro: "seattle area" },
  "los angeles": { country: "united states", state: "CA", aliases: ["la"], metro: "los angeles area" },
  "santa monica": { country: "united states", state: "CA", metro: "los angeles area" },
  pasadena: { country: "united states", state: "CA", metro: "los angeles area" },
  irvine: { country: "united states", state: "CA", metro: "los angeles area" },
  "san diego": { country: "united states", state: "CA" },
  sacramento: { country: "united states", state: "CA" },
  boston: { country: "united states", state: "MA", metro: "boston area" },
  somerville: { country: "united states", state: "MA", metro: "boston area" },
  austin: { country: "united states", state: "TX" },
  dallas: { country: "united states", state: "TX", metro: "dallas fort worth" },
  "fort worth": { country: "united states", state: "TX", metro: "dallas fort worth" },
  plano: { country: "united states", state: "TX", metro: "dallas fort worth" },
  irving: { country: "united states", state: "TX", metro: "dallas fort worth" },
  houston: { country: "united states", state: "TX" },
  "san antonio": { country: "united states", state: "TX" },
  chicago: { country: "united states", state: "IL" },
  "washington dc": { country: "united states", state: "DC", aliases: ["washington d c", "dc"], label: "Washington", metro: "dc area" },
  bethesda: { country: "united states", state: "MD", metro: "dc area" },
  baltimore: { country: "united states", state: "MD" },
  denver: { country: "united states", state: "CO", metro: "denver area" },
  boulder: { country: "united states", state: "CO", metro: "denver area" },
  atlanta: { country: "united states", state: "GA" },
  miami: { country: "united states", state: "FL" },
  tampa: { country: "united states", state: "FL" },
  orlando: { country: "united states", state: "FL" },
  phoenix: { country: "united states", state: "AZ", metro: "phoenix area" },
  scottsdale: { country: "united states", state: "AZ", metro: "phoenix area" },
  philadelphia: { country: "united states", state: "PA" },
  pittsburgh: { country: "united states", state: "PA" },
  portland: { country: "united states", state: "OR" },
  "salt lake city": { country: "united states", state: "UT" },
  minneapolis: { country: "united states", state: "MN", metro: "twin cities" },
  "saint paul": { country: "united states", state: "MN", aliases: ["st paul"], label: "St Paul", metro: "twin cities" },
  detroit: { country: "united states", state: "MI" },
  "ann arbor": { country: "united states", state: "MI" },
  nashville: { country: "united states", state: "TN" },
  raleigh: { country: "united states", state: "NC", metro: "research triangle" },
  "chapel hill": { country: "united states", state: "NC", metro: "research triangle" },
  charlotte: { country: "united states", state: "NC" },
  columbus: { country: "united states", state: "OH" },
  cleveland: { country: "united states", state: "OH" },
  cincinnati: { country: "united states", state: "OH" },
  indianapolis: { country: "united states", state: "IN" },
  "kansas city": { country: "united states", state: "MO" },
  "st louis": { country: "united states", state: "MO", aliases: ["saint louis"] },
  "las vegas": { country: "united states", state: "NV" },
  madison: { country: "united states", state: "WI" },
  // United Kingdom & Ireland
  london: { country: "united kingdom" },
  manchester: { country: "united kingdom" },
  edinburgh: { country: "united kingdom" },
  birmingham: { country: "united kingdom" },
  glasgow: { country: "united kingdom" },
  dublin: { country: "ireland" },
  // Canada
  toronto: { country: "canada", aliases: ["gta", "greater toronto area"], metro: "toronto area" },
  mississauga: { country: "canada", metro: "toronto area" },
  markham: { country: "canada", metro: "toronto area" },
  edmonton: { country: "canada" },
  vancouver: { country: "canada" },
  montreal: { country: "canada" },
  calgary: { country: "canada" },
  ottawa: { country: "canada" },
  waterloo: { country: "canada", metro: "waterloo region" },
  kitchener: { country: "canada", metro: "waterloo region" },
  // Asia-Pacific & Middle East
  singapore: { country: "singapore" },
  sydney: { country: "australia" },
  melbourne: { country: "australia" },
  brisbane: { country: "australia" },
  perth: { country: "australia" },
  adelaide: { country: "australia" },
  canberra: { country: "australia" },
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
  "united states": [
    "usa",
    "united states of america",
    // State names say "US" just as clearly. ("New Mexico" is left out: it
    // contains "Mexico".)
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida",
    "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
    "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska",
    "nevada", "new hampshire", "new jersey", "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
    "virginia", "washington", "west virginia", "wisconsin", "wyoming",
  ],
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

/**
 * US state codes, read as "United States" when they stand alone as a part
 * ("San Jose, CA"). Three collide with country codes - CA (Canada), IN
 * (India), DE (Germany) - and those count as a state only when every city
 * named alongside is in the US.
 */
const US_STATE_CODES = new Set(
  "al ak az ar ca co ct de dc fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy".split(" "),
);

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
  /** For each metro named: the parts of it named, or null for "the whole metro". */
  metroAreas: Map<string, Set<string> | null>;
}

/** Cities, metro areas and countries named in a free-text location. */
export function resolvePlace(text: string | null | undefined): ResolvedPlace {
  const cities = new Set<string>();
  const metros = new Set<string>();
  const countries = new Set<string>();
  const metroAreas = new Map<string, Set<string> | null>();
  if (!text) return { cities, metros, countries, metroAreas };

  let padded = ` ${normalizePlace(text)} `;
  for (const [term, city] of CITY_TERMS) {
    if (padded.includes(` ${term} `)) {
      cities.add(city);
      const info = CITIES[city];
      countries.add(info.country);
      if (info.metro) {
        metros.add(info.metro);
        const prior = metroAreas.get(info.metro);
        if (!info.areas || prior === null) metroAreas.set(info.metro, null);
        else metroAreas.set(info.metro, new Set([...(prior ?? []), ...info.areas]));
      }
      padded = padded.split(` ${term} `).join(" ");
    }
  }
  for (const [term, country] of COUNTRY_TERMS) {
    if (padded.includes(` ${term} `)) countries.add(country);
  }
  const allCitiesInUs = cities.size > 0 && Array.from(cities).every((c) => CITIES[c].country === "united states");
  for (const part of text.split(/[,|/()]/)) {
    const code = normalizePlace(part);
    const isState = US_STATE_CODES.has(code);
    if (COUNTRY_CODES[code] && !(isState && allCitiesInUs)) countries.add(COUNTRY_CODES[code]);
    else if (isState && (!COUNTRY_CODES[code] || allCitiesInUs)) countries.add("united states");
  }
  return { cities, metros, countries, metroAreas };
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

/** Same commuting area: a shared metro, and a shared part of it when both sides name one. */
function sameCommute(a: ResolvedPlace, b: ResolvedPlace): boolean {
  for (const [metro, areasA] of a.metroAreas) {
    if (!b.metroAreas.has(metro)) continue;
    const areasB = b.metroAreas.get(metro)!;
    if (areasA === null || areasB === null || intersects(areasA, areasB)) return true;
  }
  return false;
}

/**
 * Whether a job's location satisfies ONE place the user named.
 *
 * - A city preference matches the same city, anywhere in its commuting
 *   area (all of Delhi NCR; only the nearby part of the Bay Area), or a
 *   job that only names the country (it might be there; nothing says
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
    if (intersects(want.cities, job.cities) || sameCommute(want, job)) return true;
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

const COUNTRY_LABEL: Record<string, string> = {
  "united states": "USA",
  "united kingdom": "UK",
  "united arab emirates": "UAE",
};

function titleCase(text: string): string {
  return text.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/**
 * Every city this module understands, as the location picker shows it:
 * "San Jose, CA, USA", "Pune, India". Anything typed that isn't here is
 * still accepted as written.
 */
export function placeSuggestions(): string[] {
  return Object.entries(CITIES).map(([city, info]) => {
    const name = info.label ?? titleCase(city);
    const country = COUNTRY_LABEL[info.country] ?? titleCase(info.country);
    if (info.label?.includes(",")) return info.label;
    return info.state ? `${name}, ${info.state}, ${country}` : name === country ? name : `${name}, ${country}`;
  });
}
