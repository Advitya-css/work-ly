const fs = require('fs');

let code = fs.readFileSync('src/components/career/sections/certification-section.tsx', 'utf8');
code = code.replace(
  `import { DeleteCertificationButton } from "@/components/career/sections/delete-buttons";`,
  `import { DeleteCertificationButton } from "@/components/career/sections/delete-buttons";\nimport { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";`
);

code = code.replace(
  `<CertificationDialog certification={cert} />`,
  `{cert.isUncertain && <ConfirmEntityButton id={cert.id} type="certification" />}\n                  <CertificationDialog certification={cert} />`
);
fs.writeFileSync('src/components/career/sections/certification-section.tsx', code);
