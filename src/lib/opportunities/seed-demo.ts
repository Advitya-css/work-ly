"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { listJobsByUserId } from "@/lib/db/jobs";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { UNIVERSITY_LOCATIONS, UNIVERSITY_ALIASES } from "@/lib/student/legal-limits";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { DEMO_JOBS } from "@/lib/opportunities/demo-jobs";

/**
 * Runs each fictional posting in demo-jobs.ts through the exact same
 * submit -> parse -> analyze -> prioritize pipeline a real pasted job goes
 * through - so the resulting Fit/Priority/gaps for demo data are real
 * output from the real engine, not canned numbers. Idempotent: skips any
 * demo job whose title+company the user already has, so clicking the
 * button twice doesn't create duplicates.
 */
export async function seedDemoOpportunitiesAction(): Promise<{ created: number; skipped: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const existingJobs = await listJobsByUserId(user.id);
  const existingKeys = new Set(
    existingJobs.map((j) => `${(j.title ?? "").toLowerCase()}::${(j.company ?? "").toLowerCase()}`),
  );

  let created = 0;
  let skipped = 0;

  const profile = await getCareerProfileByUserId(user.id);
  const uni = profile?.university ? profile.university.trim() : null;
  
  let targetCity = "New York, NY";
  let targetUni = uni || "New York University";
  
  if (uni) {
    let normalizedUni = uni.toLowerCase();
    if (UNIVERSITY_ALIASES[normalizedUni]) normalizedUni = UNIVERSITY_ALIASES[normalizedUni][0];
    else {
      for (const aliases of Object.values(UNIVERSITY_ALIASES) as string[][]) {
        if (aliases.includes(normalizedUni)) {
          normalizedUni = aliases[0];
          break;
        }
      }
    }
    const city = UNIVERSITY_LOCATIONS[normalizedUni]?.[0];
    if (city) {
      targetCity = city.charAt(0).toUpperCase() + city.slice(1) + (profile?.studentCountry ? `, ${profile.studentCountry}` : "");
    } else {
      targetCity = profile?.location || "Unknown City";
    }
  }

  // Generate dynamic demo jobs tailored to their university
  const dynamicJobs = [...DEMO_JOBS];
  
  // Replace the first job (Bobst Library) with a dynamic On-Campus job
  dynamicJobs[0] = {
    title: "Student Ambassador",
    company: targetUni,
    text: `Student Ambassador\nCompany: ${targetUni}\nLocation: ${targetCity}\nEmployment Type: Part-time\nWork Mode: Onsite\n\nAbout the role:\nWe are seeking a Student Ambassador to lead tours for prospective students. This is a highly visible role representing ${targetUni}.\n\nRequirements (must have):\n- Current student at ${targetUni}\n- Excellent public speaking\n\nSalary: 18 per hour\nIndustry: Higher Education\nSeniority: Entry\nDeadline: 2026-09-01`
  };

  // Replace the second job (IT Help Desk) with a dynamic Off-Campus job
  dynamicJobs[1] = {
    title: "Local Cafe Barista",
    company: "Campus Coffee House",
    text: `Local Cafe Barista\nCompany: Campus Coffee House\nLocation: ${targetCity}\nEmployment Type: Part-time\nWork Mode: Onsite\n\nAbout the role:\nWe are hiring Baristas for our fast-paced coffee shop located right next to ${targetUni}. Perfect flexible hours for students.\n\nRequirements (must have):\n- Friendly attitude\n- Fast learner\n\nSalary: 17 per hour\nIndustry: Food & Beverage\nSeniority: Entry\nDeadline: 2026-10-15`
  };

  for (const demoJob of dynamicJobs) {
    const key = `${demoJob.title.toLowerCase()}::${demoJob.company.toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    const result = await submitParseAndAnalyzeJob(user.id, { inputMethod: "PASTED_TEXT", text: demoJob.text });
    if ("error" in result) {
      skipped += 1;
      continue;
    }
    created += 1;
  }

  revalidatePath("/opportunities");
  revalidatePath("/analyze-job");
  return { created, skipped };
}
