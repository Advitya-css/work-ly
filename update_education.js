const fs = require('fs');

let code = fs.readFileSync('src/components/career/sections/education-section.tsx', 'utf8');
code = code.replace(
  `import { DeleteEducationButton } from "@/components/career/sections/delete-buttons";`,
  `import { DeleteEducationButton } from "@/components/career/sections/delete-buttons";\nimport { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";`
);

code = code.replace(
  `<EducationDialog education={edu} />`,
  `{edu.isUncertain && <ConfirmEntityButton id={edu.id} type="education" />}\n                  <EducationDialog education={edu} />`
);
fs.writeFileSync('src/components/career/sections/education-section.tsx', code);
