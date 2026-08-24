const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/applications/[id]/page.tsx', 'utf8');

if (!code.includes('ApplicationStrategyCard')) {
  // 1. Add import
  code = code.replace(
    'import { InterviewPrepCard } from "@/components/applications/interview-prep-card";',
    'import { InterviewPrepCard } from "@/components/applications/interview-prep-card";\nimport { ApplicationStrategyCard } from "@/components/applications/application-strategy-card";'
  );

  // 2. Inject component
  const target = `{application.reachedInterviewAt && (
            <InterviewPrepCard applicationId={application.id} />
          )}`;
  const replacement = `<ApplicationStrategyCard applicationId={application.id} />\n\n          {application.reachedInterviewAt && (
            <InterviewPrepCard applicationId={application.id} />
          )}`;

  code = code.replace(target, replacement);
  fs.writeFileSync('src/app/(app)/applications/[id]/page.tsx', code);
}
