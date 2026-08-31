import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AuthProvider, AuthResult, AuthUser } from "@/lib/auth/types";
import { getUserById } from "@/lib/db/users";
import { pool } from "@/lib/db/pool";

/**
 * Supabase Auth implementation of the AuthProvider contract. Activate with:
 *   AUTH_PROVIDER=supabase
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *
 * Not exercised in Phase 1 (no Supabase project is connected yet - see the
 * README), but implemented against the real @supabase/ssr APIs so flipping
 * the env var is the only step required once a project exists.
 */
async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "AUTH_PROVIDER=supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be set.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component with no cookie-write access;
          // safe to ignore when middleware is refreshing the session.
        }
      },
    },
  });
}

function toAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    onboardedAt: null,
  };
}

export const supabaseAuthProvider: AuthProvider = {
  async signUp({ email, password, name }): Promise<AuthResult> {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) return { error: error?.message ?? "Sign up failed." };
    return { user: toAuthUser(data.user) };
  },

  async signIn({ email, password }): Promise<AuthResult> {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? "Sign in failed." };
    return { user: toAuthUser(data.user) };
  },

  async signOut() {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Auth user only contains JWT data. We must merge it with the database record
    // to get application-level flags like isPro.
    let dbUser = await getUserById(user.id);
    
    // If using Supabase Auth without a Postgres trigger, the user might not exist in public.users yet.
    // Lazily create them to ensure data consistency for foreign keys and upgrades.
    if (!dbUser) {
      try {
        await pool.query(
          `INSERT INTO users (id, email, name, "avatarUrl", "emailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, now(), now())
           ON CONFLICT (id) DO NOTHING`,
          [
            user.id,
            user.email ?? "",
            (user.user_metadata?.name as string) ?? null,
            (user.user_metadata?.avatar_url as string) ?? null
          ]
        );
        dbUser = await getUserById(user.id);
      } catch (err) {
        console.error("Failed to lazily create missing public.user:", err);
      }
    }

    const authUser = toAuthUser(user);
    
    if (dbUser) {
      authUser.isPro = dbUser.isPro;
      authUser.proUntil = dbUser.proUntil;
      authUser.onboardedAt = dbUser.onboardedAt;
    }
    
    return authUser;
  },
};
