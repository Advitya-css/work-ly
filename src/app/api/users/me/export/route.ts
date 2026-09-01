import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { listApplicationsByUserId } from "@/lib/db/applications";
import { listJobsByUserId } from "@/lib/db/jobs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getCareerProfileByUserId(user.id);
    const goals = await listCareerGoalsByUserId(user.id);
    const applications = await listApplicationsByUserId(user.id);
    const jobs = await listJobsByUserId(user.id);

    const exportData = {
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        
      },
      profile,
      goals,
      jobs,
      applications,
      exportTimestamp: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="workly-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
