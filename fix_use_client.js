const fs = require('fs');

function fixUseClient(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('"use client";')) {
    code = code.replace(/"use client";\n?/g, '');
    code = '"use client";\n' + code;
  }
  fs.writeFileSync(file, code);
}

fixUseClient('src/components/applications/application-strategy-card.tsx');
fixUseClient('src/components/applications/interview-prep-card.tsx');
fixUseClient('src/components/chat/ask-workly.tsx');
