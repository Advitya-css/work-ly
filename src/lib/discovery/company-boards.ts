import { resolvePlace } from "@/lib/places";

/**
 * Company career boards added to a user's Discover sources automatically.
 *
 * Every entry here was checked live (24 Sep 2026) against the company's
 * public board on job-boards.greenhouse.io, jobs.lever.co or
 * jobs.ashbyhq.com, and had open roles in that country. A guessed handle
 * just shows as a broken source, so nothing goes in this list unverified -
 * and boards do move: Postman and PhonePe have left Greenhouse since their
 * postings were indexed.
 *
 * Big public job boards rarely carry Indian listings; these boards are
 * where India-based tech, data, product and business roles actually are.
 */

export interface CompanyBoard {
  company: string;
  adapterId: "greenhouse" | "lever" | "ashby";
  boardToken: string;
}

const BOARDS_BY_COUNTRY: Record<string, CompanyBoard[]> = {
  india: [
    { company: "DoorDash India", adapterId: "greenhouse", boardToken: "doordashindia" },
    { company: "Razorpay", adapterId: "greenhouse", boardToken: "razorpaysoftwareprivatelimited" },
    { company: "Glean", adapterId: "greenhouse", boardToken: "gleanwork" },
    { company: "Smartsheet", adapterId: "greenhouse", boardToken: "smartsheet" },
    { company: "Sigmoid", adapterId: "greenhouse", boardToken: "sigmoid" },
    { company: "Accordion India", adapterId: "greenhouse", boardToken: "accordionindia" },
    { company: "CRED", adapterId: "lever", boardToken: "cred" },
    { company: "Meesho", adapterId: "lever", boardToken: "meesho" },
    { company: "Zeta", adapterId: "lever", boardToken: "zeta" },
    { company: "Brillio", adapterId: "lever", boardToken: "brillio-2" },
    { company: "Hevo Data", adapterId: "lever", boardToken: "hevodata" },
    { company: "Mindtickle", adapterId: "lever", boardToken: "mindtickle" },
    { company: "Acceldata", adapterId: "lever", boardToken: "acceldata" },
    { company: "Level AI", adapterId: "lever", boardToken: "levelai" },
    { company: "JumpCloud", adapterId: "lever", boardToken: "jumpcloud" },
    { company: "Weekday (startup roles)", adapterId: "lever", boardToken: "weekdayworks" },
    { company: "Sarvam AI", adapterId: "ashby", boardToken: "sarvam" },
    { company: "Bolna AI", adapterId: "ashby", boardToken: "bolna" },
  ],
};

/**
 * Handles that were added to accounts earlier but aren't live boards on
 * that ATS (Swiggy and Atlassian hire through their own career sites;
 * Postman and PhonePe no longer have Greenhouse boards). They only ever
 * showed as "Error", so they are removed.
 */
export const RETIRED_BOARDS: { adapterId: string; boardToken: string }[] = [
  { adapterId: "lever", boardToken: "swiggy" },
  { adapterId: "lever", boardToken: "atlassian" },
  { adapterId: "greenhouse", boardToken: "postman" },
  { adapterId: "greenhouse", boardToken: "phonepe" },
];

/**
 * Boards for where the user lives or says they want to work. Someone with
 * no location yet gets the India set, because that's Work-ly's home market.
 */
export function companyBoardsFor(places: (string | null | undefined)[]): CompanyBoard[] {
  const countries = new Set<string>();
  for (const p of places) for (const c of resolvePlace(p).countries) countries.add(c);
  if (countries.size === 0) countries.add("india");
  return Array.from(countries).flatMap((c) => BOARDS_BY_COUNTRY[c] ?? []);
}
