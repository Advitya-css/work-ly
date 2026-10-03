import "server-only";
import { cache } from "react";
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

/**
 * Convenience helper for Server Components / layouts. Wrapped in React's
 * per-request cache: the layout, the page and its components all ask for
 * the user, and that used to be one database round trip each.
 */
export const getCurrentUser = cache(async () => authProvider.getCurrentUser());
