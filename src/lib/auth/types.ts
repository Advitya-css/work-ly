/**
 * Auth provider abstraction.
 *
 * Two implementations satisfy this interface:
 *  - `providers/local.ts`   - email/password against our own Postgres
 *                              `users` table. Zero external dependencies,
 *                              works out of the box. Default for dev.
 *  - `providers/supabase.ts` - Supabase Auth, for when a real Supabase
 *                              project exists. Activate by setting
 *                              AUTH_PROVIDER="supabase" and the three
 *                              Supabase env vars (see .env.example).
 *
 * App code should only ever import from `lib/auth/index.ts`, never reach
 * into a specific provider directly - that keeps the swap a one-line env
 * var change.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardedAt: Date | null;
}

export interface AuthResult {
  user?: AuthUser;
  error?: string;
}

export interface AuthProvider {
  signUp(input: { email: string; password: string; name?: string }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Reads the current session server-side. Read-only - safe in Server Components. */
  getCurrentUser(): Promise<AuthUser | null>;
}
