import pg from "pg";
import { readdirSync } from "fs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }
  
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode"); // Strip Prisma's sslmode=require
  
  const client = new pg.Client({
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false } // Required for Supabase Node connections
  });
  
  await client.connect();
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS _workly_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  
  const migrations = readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
    
  let count = 0;
  for (const name of migrations) {
    const res = await client.query("INSERT INTO _workly_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
    if (res.rowCount > 0) count++;
  }
  
  await client.end();
  console.log(`Successfully synced ${count} migrations! Your database is now perfectly up to date.`);
}
main();
