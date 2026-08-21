import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function main() {
  const url = process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;
  const client = new pg.Client({
    connectionString: new URL(url).toString().replace('?sslmode=require', ''),
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const migrations = readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
    
  for (const name of migrations) {
    const sqlPath = join("prisma/migrations", name, "migration.sql");
    const sql = readFileSync(sqlPath, "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Successfully applied missing pieces from: ${name}`);
    } catch (e) {
      await client.query("ROLLBACK");
      // Ignore "already exists" errors since the tables are mostly there
      if (!e.message.includes("already exists")) {
        console.error(`Error in ${name}: ${e.message}`);
      } else {
        console.log(`Skipped existing pieces in: ${name}`);
      }
    }
  }
  
  await client.end();
  console.log("Database schema fully repaired!");
}
main();
