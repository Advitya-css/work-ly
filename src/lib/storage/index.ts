import { localStorageProvider } from "@/lib/storage/providers/local";
import type { StorageProvider } from "@/lib/storage/types";

export type { StorageProvider, StorageObject, StorageUploadInput } from "@/lib/storage/types";

function resolveProvider(): StorageProvider {
  // Only "local" is implemented in Phase 1. Supabase Storage / S3 / R2
  // providers plug in here later behind the same StorageProvider interface -
  // see .env.example's STORAGE_PROVIDER for the intended switch.
  return localStorageProvider;
}

export const storageProvider = resolveProvider();
