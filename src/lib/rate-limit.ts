import "server-only";
import { pool } from "@/lib/db/pool";

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  // We use Postgres for rate limiting to ensure it works across Vercel serverless functions.
  // In a high-traffic app, Redis would be better, but this avoids adding another infrastructure dependency.
  try {
    const expiresAt = new Date(Date.now() + windowSeconds * 1000).toISOString();
    
    // Insert if not exists, otherwise update count if unexpired. 
    // If expired, reset count to 1 and update expires_at.
    const { rows } = await pool.query(
      `
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES ($1, 1, $3)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE 
          WHEN rate_limits.expires_at < now() THEN 1 
          ELSE rate_limits.count + 1 
        END,
        expires_at = CASE 
          WHEN rate_limits.expires_at < now() THEN $3 
          ELSE rate_limits.expires_at 
        END
      RETURNING count, expires_at;
      `,
      [key, limit, expiresAt]
    );

    const record = rows[0];
    if (!record) return true;
    
    if (record.count > limit) {
      return false;
    }
    
    // Clean up expired records randomly (~1% of requests) to prevent table bloat
    if (Math.random() < 0.01) {
      pool.query(`DELETE FROM rate_limits WHERE expires_at < now()`).catch(() => {});
    }
    
    return true;
  } catch (err) {
    // Fail open if the table doesn't exist yet (e.g., migrations haven't run)
    // or if the DB connection temporarily fails.
    console.error("[workly:rate-limit] Failed to check rate limit:", err);
    return true;
  }
}
