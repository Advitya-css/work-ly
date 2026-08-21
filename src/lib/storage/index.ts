import { localStorageProvider } from "@/lib/storage/providers/local";
import { supabaseStorageProvider } from "@/lib/storage/providers/supabase";
import type { StorageProvider } from "@/lib/storage/types";

export type { StorageProvider, StorageObject, StorageUploadInput } from "@/lib/storage/types";


const disabledProvider: StorageProvider = {
  name: "disabled",
  async upload() {
    throw new Error("STORAGE_PROVIDER='local' cannot be used in production. Please configure an S3 or Supabase Storage bucket.");
  },
  async download() {
    throw new Error("STORAGE_PROVIDER='local' cannot be used in production.");
  },
  async delete() {
    return;
  }
};

function resolveProvider(): StorageProvider {
  const providerType = process.env.STORAGE_PROVIDER ?? "local";
  
  if (providerType === "supabase") {
    return supabaseStorageProvider;
  }
  
  if (providerType === "local" && process.env.NODE_ENV === "production") {
    return disabledProvider;
  }

  return localStorageProvider;
}

export const storageProvider = resolveProvider();
