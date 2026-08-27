const fs = require('fs');

let stub = fs.readFileSync('src/lib/scoring/providers/stub.ts', 'utf8');

const target = `  const isRemote = job.workMode === "REMOTE";
  if (isRemote) {
    if (job.country && countries.length > 0 && !countries.some(c => job.country!.includes(c))) {`;

const replacement = `  const isRemote = job.workMode === "REMOTE";
  if (isRemote) {
    const candidateCountries = [...countries];
    if (home && !candidateCountries.some(c => home.includes(c))) {
      candidateCountries.push(home);
    }
    
    if (job.country && candidateCountries.length > 0 && !candidateCountries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {`;

stub = stub.replace(target, replacement);

fs.writeFileSync('src/lib/scoring/providers/stub.ts', stub);
