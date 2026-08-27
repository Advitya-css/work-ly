const fs = require('fs');
let code = fs.readFileSync('src/app/p/[id]/page.tsx', 'utf8');
code = code.replace(
  'FROM "CareerProfile" cp \\n     JOIN "User" u',
  'FROM career_profiles cp \\n     JOIN users u'
);
fs.writeFileSync('src/app/p/[id]/page.tsx', code);
