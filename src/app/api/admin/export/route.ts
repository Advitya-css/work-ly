import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  
  if (key !== process.env.ADMIN_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await getCurrentUser();
  if (!user || user.email !== "advitya@work-ly.in") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { rows } = await pool.query(`
      SELECT email, name, "createdAt", "isPro" 
      FROM users 
      WHERE email IS NOT NULL 
      ORDER BY "createdAt" DESC
    `);

    // Basic CSV generation
    const header = "email,name,joinedAt,isPro\n";
    const csv = rows.map(r => {
      const email = r.email;
      const name = r.name ? `"${r.name.replace(/"/g, '""')}"` : "";
      const joined = r.createdAt.toISOString();
      const isPro = r.isPro;
      return `${email},${name},${joined},${isPro}`;
    }).join("\n");

    return new NextResponse(header + csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="workly-users.csv"`,
      },
    });
  } catch (error) {
    return new NextResponse("Failed to export", { status: 500 });
  }
}
