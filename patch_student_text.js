const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/settings/page.tsx', 'utf8');

code = code.replace(
  '? "Workly is showing you campus jobs and internships. Leaving keeps everything you have saved."\n              : "Replaces the normal navigation with campus jobs, internships, and the work-hour rules that apply to student work."',
  '? "Campus jobs and internships are currently prioritized. Leaving keeps your saved items."\n              : "Switch to campus jobs, internships, and student work rules."'
);

fs.writeFileSync('src/app/(app)/settings/page.tsx', code);
