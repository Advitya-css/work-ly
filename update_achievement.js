const fs = require('fs');

let code = fs.readFileSync('src/components/career/sections/achievement-section.tsx', 'utf8');
code = code.replace(
  `import { DeleteAchievementButton } from "@/components/career/sections/delete-buttons";`,
  `import { DeleteAchievementButton } from "@/components/career/sections/delete-buttons";\nimport { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";`
);

code = code.replace(
  `<AchievementDialog achievement={ach} />`,
  `{ach.isUncertain && <ConfirmEntityButton id={ach.id} type="achievement" />}\n                  <AchievementDialog achievement={ach} />`
);
fs.writeFileSync('src/components/career/sections/achievement-section.tsx', code);
