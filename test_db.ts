import { pool } from './src/lib/db/pool';

async function run() {
  const { rows } = await pool.query('SELECT id, name, kind, "createdAt" FROM job_source_configs');
  console.log(rows);
  process.exit(0);
}
run();
