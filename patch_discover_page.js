const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/discover/page.tsx', 'utf8');

code = code.replace(
  'careerGoal,',
  'careerGoal,\n    profileLocation: profile.profile?.location ?? null,'
);

fs.writeFileSync('src/app/(app)/discover/page.tsx', code);
