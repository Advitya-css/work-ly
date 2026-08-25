const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/providers/local.ts', 'utf8');

const importTarget = `import { createUser, getUserByEmail, getUserById } from "@/lib/db/users";`;
const importReplacement = `import { createUser, getUserByEmail, getUserById, updateUser } from "@/lib/db/users";`;
code = code.replace(importTarget, importReplacement);

const target = `  async getCurrentUser(): Promise<AuthUser | null> {
    const token = await readSessionToken();
    if (!token) return null;
    const payload = await verifySessionToken(token);
    if (!payload) return null;
    const user = await getUserById(payload.sub);
    return user ? toAuthUser(user) : null;
  },
};`;

const replacement = `  async getCurrentUser(): Promise<AuthUser | null> {
    const token = await readSessionToken();
    if (!token) return null;
    const payload = await verifySessionToken(token);
    if (!payload) return null;
    const user = await getUserById(payload.sub);
    return user ? toAuthUser(user) : null;
  },

  async signInWithOAuth(input: { provider: "google"; providerId: string; email: string; name?: string; avatarUrl?: string }): Promise<import("../types").AuthResult> {
    let user = await getUserByEmail(input.email);
    
    if (user) {
      // Update name/avatar if empty, but don't overwrite user's custom changes
      const updates: { name?: string; avatarUrl?: string } = {};
      if (!user.name && input.name) updates.name = input.name;
      if (!user.avatarUrl && input.avatarUrl) updates.avatarUrl = input.avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await updateUser(user.id, updates);
      }
    } else {
      user = await createUser({
        email: input.email,
        name: input.name || null,
        avatarUrl: input.avatarUrl || null,
      }); // Implicitly passwordHash is null
    }

    const token = await createSessionToken({ sub: user.id, email: user.email }, true);
    await setSessionCookie(token, true);

    return { user: toAuthUser(user) };
  }
};`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/auth/providers/local.ts', code);
