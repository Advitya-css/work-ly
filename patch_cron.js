const fs = require('fs');
let code = fs.readFileSync('src/app/api/cron/job-alerts/route.ts', 'utf8');

const oldQuery = `    // Fetch all users who have an active career goal with a primary target role
    const { rows } = await pool.query(\`
      SELECT u.id, u.email, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE' AND cg."primaryTargetRole" IS NOT NULL
    \`);`;

const newQuery = `    // The "Drip" method: Pull up to 15 PRO users who haven't had an alert in the last 7 days.
    const { rows } = await pool.query(\`
      SELECT u.id, u.email, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE' 
        AND cg."primaryTargetRole" IS NOT NULL
        AND u."isPro" = true
        AND (u."lastAlertSentAt" IS NULL OR u."lastAlertSentAt" < NOW() - INTERVAL '7 days')
      LIMIT 15
    \`);`;

code = code.replace(oldQuery, newQuery);

const oldCatch = `      } catch (err) {
        console.error(\`[workly:cron] Failed discovery for user \${userId}:\`, err);
      }
    }`;

const newCatch = `      } catch (err) {
        console.error(\`[workly:cron] Failed discovery for user \${userId}:\`, err);
      } finally {
        // Mark them as processed whether they succeeded, failed, or had 0 jobs,
        // so we don't get stuck in an infinite retry loop on the same user.
        await pool.query(\`UPDATE users SET "lastAlertSentAt" = NOW() WHERE id = $1\`, [userId]);
      }
    }`;

code = code.replace(oldCatch, newCatch);

fs.writeFileSync('src/app/api/cron/job-alerts/route.ts', code);
