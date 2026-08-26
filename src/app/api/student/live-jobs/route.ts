import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { apiProviderSource } from "@/lib/discovery/sources/api-provider";

export const maxDuration = 30;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "part-time"; // part-time, internship, new-grad

  const profile = await getCareerProfileByUserId(user.id);
  if (!profile || !profile.university || !profile.studentCountry) {
    return NextResponse.json({ jobs: [] });
  }

  // Get location hint from the profile
  // For a real app, you would look up the UNIVERSITY_LOCATIONS, but Adzuna's API
  // is quite smart if you just pass the university name as the location (e.g. "University of Toronto")
  // Or better, just pass the university name + country.
  const location = `${profile.university}, ${profile.studentCountry}`;

  let keywords = "";
  if (type === "part-time") keywords = "part-time OR retail OR hospitality OR campus";
  if (type === "internship") keywords = "internship OR co-op OR trainee";
  if (type === "new-grad") keywords = "graduate OR entry-level OR junior OR \"new grad\"";

  try {
    if (!apiProviderSource.isConfigured || !apiProviderSource.isConfigured({})) {
       // If no API key, return a mock response for demonstration
       return NextResponse.json({ 
         jobs: [
           { title: `Local ${type} Role 1`, company: "Local Tech Co", location: location, url: "#" },
           { title: `Local ${type} Role 2`, company: "Campus Services", location: location, url: "#" }
         ]
       });
    }

    const rawJobs = await apiProviderSource.ingest({
      homeLocation: location,
      query: keywords, limit: 10, config: {},
    });

    return NextResponse.json({ jobs: rawJobs.slice(0, 10) });
  } catch (err) {
    console.error("Live jobs fetch error:", err);
    return NextResponse.json({ jobs: [] });
  }
}
