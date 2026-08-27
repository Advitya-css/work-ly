const fs = require('fs');
let engine = fs.readFileSync('src/lib/search/engine.ts', 'utf8');

// Add profileLocation to SearchContext
engine = engine.replace(
  'careerGoal: CareerGoal | null;',
  'careerGoal: CareerGoal | null;\n  profileLocation: string | null;'
);

// Update structuredScore remote logic to also check profileLocation
const oldRemote = `  if (job.workMode === "REMOTE") {
    if (job.country && context.careerGoal?.countries?.length && !context.careerGoal.countries.some(c => job.country!.includes(c))) {
      parts.push(0.3); // Penalize remote roles restricted to other countries
      reasons.push(\`Remote, but restricted to \${job.country}.\`);
    } else {
      parts.push(1);
      reasons.push("Remote, making it broadly location-compatible.");
    }
  } else {`;

const newRemote = `  if (job.workMode === "REMOTE") {
    const candidateCountries = [...(context.careerGoal?.countries || [])];
    if (context.profileLocation && !candidateCountries.some(c => context.profileLocation!.includes(c))) {
      // Very naive extraction: if they typed "San Francisco, US", we want "US".
      // But we can just use the whole string for a substring check against job.country.
      candidateCountries.push(context.profileLocation);
    }
    
    // If the job specifies a country (e.g. UK, Germany) and the candidate has a country/location constraint (e.g. SF, USA)
    // and they don't match, penalize heavily.
    if (job.country && candidateCountries.length > 0 && !candidateCountries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {
      parts.push(0.3);
      reasons.push(\`Remote, but restricted to \${job.country}.\`);
    } else {
      parts.push(1);
      reasons.push("Remote, making it broadly location-compatible.");
    }
  } else {`;

engine = engine.replace(oldRemote, newRemote);
fs.writeFileSync('src/lib/search/engine.ts', engine);
