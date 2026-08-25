const fs = require('fs');

// 1. discovery-board.tsx
let db = fs.readFileSync('src/components/discovery/discovery-board.tsx', 'utf8');
db = db.replace(/Organised so you don&apos;t/g, "Organized so you don&apos;t");
fs.writeFileSync('src/components/discovery/discovery-board.tsx', db);

// 2. privacy-controls.tsx
let pc = fs.readFileSync('src/components/settings/privacy-controls.tsx', 'utf8');
pc = pc.replace(/analysed jobs/g, "analyzed jobs");
fs.writeFileSync('src/components/settings/privacy-controls.tsx', pc);

// 3. document-authenticity.ts
let da = fs.readFileSync('src/lib/validation/document-authenticity.ts', 'utf8');
da = da.replace(/Paste the advert as it appears/g, "Paste the job description as it appears");
fs.writeFileSync('src/lib/validation/document-authenticity.ts', da);
