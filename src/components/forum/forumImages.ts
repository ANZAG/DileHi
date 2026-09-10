import { supabase } from "@/integrations/supabase/client";

/**
 * Bilder in Forenbeiträgen.
 *
 * Der Bucket ist bewusst nicht öffentlich: Das Forum ist der Mitgliederbereich,
 * und Lagerfotos gehören nicht ins offene Netz – auch nicht unter einer
 * schwer zu erratenden Adresse. Deshalb steht im Beitrag nicht die Bildadresse,
 * sondern nur der Ablageort (`data-path`); die eigentliche, ablaufende Adresse
 * entsteht erst beim Anzeigen.
 */
export const FORUM_IMAGE_BUCKET = "forum-images";

/** Muss zum file_size_limit des Buckets passen (Migration 20260908040000). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Eine Stunde – lang genug zum Lesen, kurz genug, dass ein kopierter Link nichts taugt. */
const SIGNED_URL_SECONDS = 3600;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function uploadForumImage(
  file: File,
  userId: string
): Promise<{ path: string; url: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Das geht nur mit Bildern (JPG, PNG, WebP, AVIF oder GIF).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Das Bild ist ${(file.size / 1024 / 1024).toFixed(1)} MB groß. Mehr als 8 MB gehen nicht.`
    );
  }

  // Der erste Ordner ist die eigene Kennung; die Policy lässt nichts anderes zu
  // und man sieht später, wer was hochgeladen hat.
  const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? "bin"}`;

  const { error } = await supabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const urls = await signForumImages([path]);
  return { path, url: urls[path] ?? "" };
}

/** Signierte Adressen für mehrere Bilder auf einmal – ein Aufruf pro Beitrag. */
export async function signForumImages(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);

  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    // `path` fehlt in den Typen mancher Versionen, kommt aber zurück.
    const p = (entry as { path?: string | null }).path;
    if (p && entry.signedUrl) map[p] = entry.signedUrl;
  }
  return map;
}
