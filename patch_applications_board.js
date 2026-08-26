const fs = require('fs');

let code = fs.readFileSync('src/components/applications/applications-board.tsx', 'utf8');

// Update imports
code = code.replace(
  'APPLICATION_STATUS_LABEL,',
  'getApplicationStatusLabel,\n  APPLICATION_STATUS_LABEL,'
);

// Add isFreelanceMode prop to ApplicationsBoard
if (!code.includes('isFreelanceMode?: boolean;')) {
  code = code.replace(
    '  options: {',
    '  isFreelanceMode?: boolean;\n  options: {'
  );
  code = code.replace(
    'export function ApplicationsBoard({\n  applications,',
    'export function ApplicationsBoard({\n  applications,\n  isFreelanceMode = false,'
  );
  code = code.replace(
    'export function ApplicationsBoard({\n  applications,\n  isFreelanceMode = false,\n  isFreelanceMode = false,', // in case I doubled it
    'export function ApplicationsBoard({\n  applications,\n  isFreelanceMode = false,'
  );
}

// Replace usages of APPLICATION_STATUS_LABEL[...]
code = code.replace(/APPLICATION_STATUS_LABEL\[([^\]]+)\]/g, 'getApplicationStatusLabel($1, isFreelanceMode)');

fs.writeFileSync('src/components/applications/applications-board.tsx', code);
