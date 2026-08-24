import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query(\`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
      ADD COLUMN IF NOT EXISTS "verificationTokenExpiresAt" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "verificationCodeHash" TEXT,
      ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
      ADD COLUMN IF NOT EXISTS "resetPasswordTokenExpiresAt" TIMESTAMPTZ;
    \`);
    return NextResponse.json({ success: true, message: "Added missing columns to users table." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
