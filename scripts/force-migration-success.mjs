import pg from "pg";
import { readdirSync } from "fs";
import { join } from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString: url });
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
    
  for (const name of migrations) {
    await client.query("INSERT INTO _workly_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
    console.log(`Marked ${name} as applied.`);
  }
  
  await client.end();
}
main();
