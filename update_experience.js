const fs = require('fs');

let code = fs.readFileSync('src/components/career/sections/experience-section.tsx', 'utf8');
code = code.replace(
  `import { DeleteExperienceButton } from "@/components/career/sections/delete-buttons";`,
  `import { DeleteExperienceButton } from "@/components/career/sections/delete-buttons";\nimport { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";`
);

code = code.replace(
  `<ExperienceDialog experience={exp} />`,
  `{exp.isUncertain && <ConfirmEntityButton id={exp.id} type="experience" />}\n                  <ExperienceDialog experience={exp} />`
);
fs.writeFileSync('src/components/career/sections/experience-section.tsx', code);
