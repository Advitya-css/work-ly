const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/career-path/page.tsx', 'utf8');

// Fix "opportunit y" bug
code = code.replace(
  '{career.relevantJobCount} matching opportunit\\n                {career.relevantJobCount === 1 ? "y" : "ies"} in your pipeline',
  '{career.relevantJobCount} matching {career.relevantJobCount === 1 ? "opportunity" : "opportunities"} in your pipeline'
);

// In src/lib/pathway/plan-90-days.ts
let planCode = fs.readFileSync('src/lib/pathway/plan-90-days.ts', 'utf8');
planCode = planCode.replace(
  /opportunit\$\{\n\s*gap\.affectedOpportunityCount === 1 \? "y" : "ies"\n\s*\}/g,
  'opportunit${gap.affectedOpportunityCount === 1 ? "y" : "ies"}'
);
planCode = planCode.replace(
  /opportunit\$\{\n\s*opportunities\.length === 1 \? "y" : "ies"\n\s*\}/g,
  'opportunit${opportunities.length === 1 ? "y" : "ies"}'
);

fs.writeFileSync('src/app/(app)/career-path/page.tsx', code);
fs.writeFileSync('src/lib/pathway/plan-90-days.ts', planCode);
