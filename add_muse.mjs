import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const { rows: users } = await client.query('SELECT id FROM users');
  for (const u of users) {
    const userId = u.id;
    await client.query(`
      INSERT INTO job_source_configs (id, "userId", "adapterId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'themuse', 'The Muse', 'PUBLIC_JOB_BOARD', '{}', 'ACTIVE', 'Open API', NOW(), NOW())
    `, [userId]);
  }
  console.log("Added The Muse to all users.");
  await client.end();
  process.exit(0);
}
run().catch(console.error);
