import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser();
  if (!user || user.email !== "advitya@work-ly.in") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate 20 new codes
    for (let i = 0; i < 20; i++) {
      const code = "BETA-" + randomBytes(4).toString("hex").toUpperCase();
      await pool.query(
        `INSERT INTO beta_codes (id, code, "isUsed") VALUES (gen_random_uuid(), $1, false)`,
        [code]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate codes" }, { status: 500 });
  }
}
