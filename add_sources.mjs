import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const { rows: users } = await client.query('SELECT id FROM users');
  for (const u of users) {
    const userId = u.id;
    
    // Add We Work Remotely
    await client.query(`
      INSERT INTO job_source_configs (id, "userId", "adapterId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'public-board-feed', 'We Work Remotely', 'PUBLIC_JOB_BOARD', '{"feedUrl":"https://weworkremotely.com/remote-jobs.rss"}', 'ACTIVE', 'Open RSS', NOW(), NOW())
    `, [userId]);
    
    // Add Remote OK
    await client.query(`
      INSERT INTO job_source_configs (id, "userId", "adapterId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'public-board-feed', 'Remote OK', 'PUBLIC_JOB_BOARD', '{"feedUrl":"https://remoteok.com/remote-jobs.rss"}', 'ACTIVE', 'Open RSS', NOW(), NOW())
    `, [userId]);

    // Add Himalayas
    await client.query(`
      INSERT INTO job_source_configs (id, "userId", "adapterId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'himalayas', 'Himalayas', 'PUBLIC_JOB_BOARD', '{}', 'ACTIVE', 'Open API', NOW(), NOW())
    `, [userId]);
  }
  
  console.log("Added WWR, Remote OK, and Himalayas to all users.");
  await client.end();
  process.exit(0);
}
run().catch(console.error);
