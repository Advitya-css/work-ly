const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const { rows } = await pool.query('SELECT email FROM users WHERE email IS NOT NULL ORDER BY "createdAt" ASC LIMIT 50');
  const emails = rows.map(r => r.email).join(', ');
  console.log("EMAILS:\n" + emails);
  process.exit(0);
}
run();
