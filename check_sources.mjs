import pg from 'pg';
import fs from 'fs';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const { rows } = await client.query(`SELECT id, "adapterId", name, status FROM job_source_configs`);
  fs.writeFileSync('db_sources.json', JSON.stringify(rows, null, 2));
  await client.end();
  process.exit(0);
}
run().catch(console.error);
