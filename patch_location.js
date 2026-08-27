const fs = require('fs');

// 1. Patch scoreLocation in stub.ts
let stub = fs.readFileSync('src/lib/scoring/providers/stub.ts', 'utf8');

// We need to replace the naive REMOTE check with one that checks country mismatch.
// Replace lines 358-364
const oldLocation = `function scoreLocation(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  // A genuine, evidence-backed default: a remote role really does satisfy
  // any location preference. Marked \`assumed\` rather than \`measured\`
  // because it is a rule rather than a comparison.
  if (job.workMode === "REMOTE") {
    return assumed(WEIGHTS.location, WEIGHTS.location, "This role is remote, so location is not a constraint.");
  }`;

const newLocation = `function scoreLocation(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  const preferredLocations = profile.profile?.preferredLocations?.length
    ? profile.profile.preferredLocations
    : (careerGoal?.preferredLocations ?? []);
  const home = profile.profile?.location ?? null;
  const countries = careerGoal?.countries ?? [];
  const workModes = careerGoal?.workModes ?? [];

  // A remote job is not automatically global. If the job specifies a country that is clearly not the user's country, it's a mismatch.
  const isRemote = job.workMode === "REMOTE";
  if (isRemote) {
    if (job.country && countries.length > 0 && !countries.some(c => job.country!.includes(c))) {
      return component(WEIGHTS.location, 0, \`Remote, but restricted to \${job.country} which does not match your target countries.\`);
    }
    return assumed(WEIGHTS.location, WEIGHTS.location, "This role is remote, making it broadly location-compatible.");
  }`;

stub = stub.replace(oldLocation, newLocation);

// Remove the now-duplicate const declarations in scoreLocation
stub = stub.replace(`  // Account-level preferences first, falling back to the career goal.
  const preferredLocations = profile.profile?.preferredLocations?.length
    ? profile.profile.preferredLocations
    : (careerGoal?.preferredLocations ?? []);
  const home = profile.profile?.location ?? null;
  const countries = careerGoal?.countries ?? [];
  const workModes = careerGoal?.workModes ?? [];`, `  const anyPreference = Boolean(home) || preferredLocations.length > 0 || countries.length > 0 || workModes.length > 0;`);

fs.writeFileSync('src/lib/scoring/providers/stub.ts', stub);


// 2. Patch structuredScore in search engine
let engine = fs.readFileSync('src/lib/search/engine.ts', 'utf8');

const oldRemote = `  // Remote roles are location-compatible with everyone.
  if (job.workMode === "REMOTE") {
    parts.push(1);
    reasons.push("Remote, so location isn't a constraint.");
  } else {`;

const newRemote = `  if (job.workMode === "REMOTE") {
    if (job.country && context.careerGoal?.countries?.length && !context.careerGoal.countries.some(c => job.country!.includes(c))) {
      parts.push(0.3); // Penalize remote roles restricted to other countries
      reasons.push(\`Remote, but restricted to \${job.country}.\`);
    } else {
      parts.push(1);
      reasons.push("Remote, making it broadly location-compatible.");
    }
  } else {`;

engine = engine.replace(oldRemote, newRemote);

fs.writeFileSync('src/lib/search/engine.ts', engine);
