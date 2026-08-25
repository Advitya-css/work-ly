const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/types.ts', 'utf8');

const target = `  getCurrentUser(): Promise<AuthUser | null>;
}`;
const replacement = `  getCurrentUser(): Promise<AuthUser | null>;
  signInWithOAuth?(input: { provider: "google"; providerId: string; email: string; name?: string; avatarUrl?: string }): Promise<AuthResult>;
}`;
code = code.replace(target, replacement);

fs.writeFileSync('src/lib/auth/types.ts', code);
