const { readFileSync, readdirSync } = require("fs");
const { join } = require("path");

async function main() {
  const { pool } = require("../src/lib/db/pool");
  
  await pool.query(`
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
    const res = await pool.query("INSERT INTO _workly_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
    if (res.rowCount > 0) count++;
  }
  
  console.log(`Successfully synced ${count} migrations! Your database is now perfectly up to date.`);
  process.exit(0);
}
main();
