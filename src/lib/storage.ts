import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

export interface UploadResult {
  url?: string;
  path?: string;
  error?: string;
}

const looksLikeMissingBucket = (msg: string) =>
  /bucket not found|not found|does not exist|no such bucket/i.test(msg);

/**
 * Upload a file/blob to the shared "documents" bucket.
 * - Auto-creates the bucket (public) on first use if it's missing.
 * - Returns a clear, human-readable error instead of throwing.
 */
export async function uploadDocument(
  supabase: SupabaseClient,
  file: File | Blob,
  path: string,
  contentType?: string,
): Promise<UploadResult> {
  const opts = { upsert: true, ...(contentType ? { contentType } : {}) };

  let { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, opts);

  // Bucket missing → try to create it, then retry once.
  if (error && looksLikeMissingBucket(error.message)) {
    const { error: createErr } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50 MB
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      return {
        error:
          `The "documents" storage bucket is missing and couldn't be created automatically ` +
          `(${createErr.message}). Ask an admin to create a public bucket named "documents" in Supabase → Storage.`,
      };
    }
    ({ error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, opts));
  }

  if (error) {
    return { error: `Upload failed: ${error.message}` };
  }

  const { data } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
