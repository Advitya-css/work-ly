const fs = require('fs');
let engine = fs.readFileSync('src/lib/search/engine.ts', 'utf8');

const oldStructured = 'return { score: parts.reduce((a, b) => a + b, 0) / parts.length, reasons };';
const newStructured = `
  let finalScore = parts.reduce((a, b) => a + b, 0) / parts.length;
  // Hard penalty if it's remote but explicitly locked to a country the candidate is not in
  if (reasons.some(r => r.startsWith("Remote, but restricted to "))) {
    finalScore *= 0.5; // Halve the structured score
  }
  return { score: finalScore, reasons };
`;

engine = engine.replace(oldStructured, newStructured);
fs.writeFileSync('src/lib/search/engine.ts', engine);
