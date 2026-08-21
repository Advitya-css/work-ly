import "server-only";
import { localAuthProvider } from "@/lib/auth/providers/local";
import { supabaseAuthProvider } from "@/lib/auth/providers/supabase";
import type { AuthProvider } from "@/lib/auth/types";

export type { AuthUser, AuthResult } from "@/lib/auth/types";

/**
 * Selects the active AuthProvider based on AUTH_PROVIDER. Both provider
 * modules are safe to import unconditionally - they only touch their
 * external dependency (Postgres / Supabase) inside function calls, not at
 * module load time - so switching providers is purely this env var.
 */
function resolveProvider(): AuthProvider {
  return process.env.AUTH_PROVIDER === "supabase" ? supabaseAuthProvider : localAuthProvider;
}

export const authProvider = resolveProvider();

/** Convenience helper for Server Components / layouts. */
export async function getCurrentUser() {
  return authProvider.getCurrentUser();
}
