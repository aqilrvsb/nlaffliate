import { createClient } from "@supabase/supabase-js";

/**
 * Uploads go to the public `uploads` bucket in Supabase Storage.
 * Vercel's filesystem is ephemeral, so we never write to disk.
 */

const BUCKET = "uploads";

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  // Service role stays server-side only — these routes are never bundled
  // into the client.
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Store an image and return its public URL.
 * `name` should be unique-ish; the same name overwrites (upsert), which keeps
 * re-uploads from piling up orphaned files.
 */
export async function uploadImage(
  name: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const sb = admin();
  const { error } = await sb.storage.from(BUCKET).upload(name, bytes, {
    contentType: contentType || "image/png",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}
