/**
 * Storage provider abstraction - compatible with local disk (dev), or
 * Supabase Storage / S3 / R2 in production. Anything that needs to persist
 * a user-uploaded file (resumes, generated documents) should go through
 * this interface.
 *
 * Deliberately private-by-default: there is no `getUrl()` that returns a
 * publicly-fetchable link. Resumes must stay private (see project brief),
 * so the only way to read a file back is `download()`, called from a
 * server context that has already checked the caller owns it - see
 * src/app/api/documents/[id]/route.ts.
 */
export interface StorageUploadInput {
  /** Path within the bucket, e.g. `resumes/${userId}/${filename}`. */
  key: string;
  data: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageObject {
  key: string;
}

export interface StorageProvider {
  readonly name: string;
  upload(input: StorageUploadInput): Promise<StorageObject>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
