const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

const importTarget = `import { ThemeProvider } from "@/components/theme-provider";`;
const importReplacement = `import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";`;
code = code.replace(importTarget, importReplacement);

const bodyTarget = `<ThemeProvider>{children}</ThemeProvider>
      </body>`;
const bodyReplacement = `<ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>`;
code = code.replace(bodyTarget, bodyReplacement);

fs.writeFileSync('src/app/layout.tsx', code);
