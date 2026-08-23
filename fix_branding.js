const fs = require('fs');
let code = fs.readFileSync('src/components/applications/interview-prep-card.tsx', 'utf8');
code = code.replace('Gemini is analyzing the job', 'Workly AI is analyzing the job');
fs.writeFileSync('src/components/applications/interview-prep-card.tsx', code);
