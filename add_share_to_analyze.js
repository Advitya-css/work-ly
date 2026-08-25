const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/analyze-job/[id]/page.tsx', 'utf8');

const importTarget = `import { DeleteJobButton } from "@/components/jobs/delete-job-button";`;
const importReplacement = `import { DeleteJobButton } from "@/components/jobs/delete-job-button";\nimport { ShareScoreButton } from "@/components/jobs/share-score-button";`;
code = code.replace(importTarget, importReplacement);

const actionTarget = `</Button>
        <DeleteJobButton id={job.id} label={job.title ?? "this analysis"} />
      </div>`;
const actionReplacement = `</Button>
        <div className="flex gap-2">
          <ShareScoreButton score={analysis.fitScore} roleTitle={job.title ?? "Untitled Role"} companyName={job.company} />
          <DeleteJobButton id={job.id} label={job.title ?? "this analysis"} />
        </div>
      </div>`;
code = code.replace(actionTarget, actionReplacement);

fs.writeFileSync('src/app/(app)/analyze-job/[id]/page.tsx', code);
