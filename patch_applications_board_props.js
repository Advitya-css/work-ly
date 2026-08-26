const fs = require('fs');
let code = fs.readFileSync('src/components/applications/applications-board.tsx', 'utf8');

code = code.replace(
  'export function ApplicationsBoard({ applications }: { applications: Application[] }) {',
  'export function ApplicationsBoard({ applications, isFreelanceMode = false }: { applications: Application[]; isFreelanceMode?: boolean }) {'
);

fs.writeFileSync('src/components/applications/applications-board.tsx', code);
