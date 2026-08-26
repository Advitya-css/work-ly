const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/providers/local.ts', 'utf8');

code = code.replace(
  'if (!user || !user.passwordHash) {\n      return { error: "Invalid email or password." };\n    }',
  'if (!user || !user.passwordHash) {\n      await bcrypt.hash(password, 10); // dummy hash for timing attack prevention\n      return { error: "Invalid email or password." };\n    }'
);

fs.writeFileSync('src/lib/auth/providers/local.ts', code);
