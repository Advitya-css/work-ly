const fs = require('fs');
let engine = fs.readFileSync('src/lib/search/engine.ts', 'utf8');

const oldPref = 'return { score: parts.reduce((a, b) => a + b, 0) / parts.length, reasons };';
const newPref = `
  let finalScore = parts.reduce((a, b) => a + b, 0) / parts.length;
  // If we know candidate countries, and this job is explicitly in a different country, tank the score.
  if (job.country && goal.countries.length > 0 && !goal.countries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {
     finalScore *= 0.5;
  }
  return { score: finalScore, reasons };
`;

engine = engine.replace(oldPref, newPref);
fs.writeFileSync('src/lib/search/engine.ts', engine);
