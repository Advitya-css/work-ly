const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/opportunities/[id]/page.tsx', 'utf8');

const importTarget = `import { DeleteJobButton } from "@/components/jobs/delete-job-button";`;
const importReplacement = `import { DeleteJobButton } from "@/components/jobs/delete-job-button";\nimport { ShareScoreButton } from "@/components/jobs/share-score-button";`;
code = code.replace(importTarget, importReplacement);

const actionTarget = `<DeleteJobButton id={job.id} label={job.title ?? "this opportunity"} />`;
const actionReplacement = `<ShareScoreButton score={analysis.fitScore} roleTitle={job.title ?? "Untitled Role"} companyName={job.company} />\n          <DeleteJobButton id={job.id} label={job.title ?? "this opportunity"} />`;
code = code.replace(actionTarget, actionReplacement);

fs.writeFileSync('src/app/(app)/opportunities/[id]/page.tsx', code);
