const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/settings/page.tsx', 'utf8');

code = code.replace(
  'Where you are, and everywhere else you would take a job. Used to filter and rank what\n            Workly shows you.',
  'Where you are, and everywhere else you would take a job.'
);

fs.writeFileSync('src/app/(app)/settings/page.tsx', code);
