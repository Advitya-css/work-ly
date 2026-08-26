const fs = require('fs');
let code = fs.readFileSync('src/lib/applications/labels.ts', 'utf8');

code = code.replace(/OFFER: "Offer"/g, 'OFFER: "Got the job"');
code = code.replace(/OFFER: "success"/g, 'OFFER: "success"');

fs.writeFileSync('src/lib/applications/labels.ts', code);
