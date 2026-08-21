import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StorageObject, StorageProvider, StorageUploadInput } from "@/lib/storage/types";

// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "workly";

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export const supabaseStorageProvider: StorageProvider = {
  name: "supabase",
  
  async upload({ key, data, contentType }: StorageUploadInput): Promise<StorageObject> {
    if (!supabase) {
      throw new Error("Supabase storage is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }
    
    // Ensure the bucket exists (this is safe to call repeatedly as Supabase ignores it if it exists)
    // Wait, the service role key can create buckets, but let's assume the user created it or we just upload.
    const { error } = await supabase.storage.from(bucketName).upload(key, data, {
      contentType,
      upsert: true,
    });
    
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    
    return { key };
  },
  
  async download(key: string): Promise<Buffer> {
    if (!supabase) throw new Error("Supabase storage is not configured.");
    
    const { data, error } = await supabase.storage.from(bucketName).download(key);
    
    if (error || !data) {
      throw new Error(`Supabase download failed: ${error?.message || "No data returned."}`);
    }
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },
  
  async delete(key: string): Promise<void> {
    if (!supabase) throw new Error("Supabase storage is not configured.");
    
    const { error } = await supabase.storage.from(bucketName).remove([key]);
    if (error) {
      console.error(`Failed to delete ${key} from Supabase:`, error);
    }
  },
};
