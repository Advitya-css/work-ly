import { localStorageProvider } from "@/lib/storage/providers/local";
import type { StorageProvider } from "@/lib/storage/types";

export type { StorageProvider, StorageObject, StorageUploadInput } from "@/lib/storage/types";

function resolveProvider(): StorageProvider {
  const providerType = process.env.STORAGE_PROVIDER ?? "local";
  
  if (providerType === "local" && process.env.NODE_ENV === "production") {
    throw new Error("STORAGE_PROVIDER='local' cannot be used in production. Please configure an S3 or Supabase Storage bucket.");
  }

  // Only "local" is implemented in Phase 1. Supabase Storage / S3 / R2
  // providers plug in here later behind the same StorageProvider interface -
  // see .env.example's STORAGE_PROVIDER for the intended switch.
  return localStorageProvider;
}

export const storageProvider = resolveProvider();
