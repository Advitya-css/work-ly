const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/discover/page.tsx', 'utf8');

code = code.replace(
  'const [profile, careerGoal,\n    profileLocation: profile.profile?.location ?? null, rawJobs',
  'const [profile, careerGoal, rawJobs'
);

code = code.replace(
  'candidateSeniority: deriveCandidateSeniority(candidateYears, careerGoal),\n    careerGoal,\n  };',
  'candidateSeniority: deriveCandidateSeniority(candidateYears, careerGoal),\n    careerGoal,\n    profileLocation: profile.profile?.location ?? null,\n  };'
);

fs.writeFileSync('src/app/(app)/discover/page.tsx', code);
