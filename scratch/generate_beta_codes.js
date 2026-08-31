require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function generateCodes(count = 10) {
  const codes = [];
  console.log(`Generating ${count} beta codes...`);
  
  for (let i = 0; i < count; i++) {
    const code = 'BETA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const id = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO beta_codes (id, code, "isUsed", "createdAt") VALUES ($1, $2, false, now())`,
      [id, code]
    );
    
    codes.push(code);
    console.log(`- ${code}`);
  }
  
  console.log('\nDone! Give these codes to your beta testers.');
  await pool.end();
}

const count = parseInt(process.argv[2]) || 10;
generateCodes(count).catch(e => {
  console.error("Error generating codes:", e);
  process.exit(1);
});
