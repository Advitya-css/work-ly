const fs = require('fs');

let code = fs.readFileSync('src/components/career/sections/project-section.tsx', 'utf8');
code = code.replace(
  `import { DeleteProjectButton } from "@/components/career/sections/delete-buttons";`,
  `import { DeleteProjectButton } from "@/components/career/sections/delete-buttons";\nimport { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";`
);

code = code.replace(
  `<ProjectDialog project={project} />`,
  `{project.isUncertain && <ConfirmEntityButton id={project.id} type="project" />}\n                  <ProjectDialog project={project} />`
);
fs.writeFileSync('src/components/career/sections/project-section.tsx', code);
