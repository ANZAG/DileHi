import { invokeFunction } from "@/lib/functionError";

/**
 * Dateien der Quellensammlung in SharePoint – die Seite im Browser.
 *
 * Hochgeladen wird direkt zu Microsoft, in Stücken: Die Edge Function
 * `sharepoint-files` besorgt nur die Hochladeadresse und legt danach die
 * Quelle an. Die Datei selbst läuft nie über Supabase, deshalb gilt dessen
 * Grenze von 50 MB je Datei hier nicht – die Scans von DileHi sind bis zu
 * 466 MB gross.
 */

/** Graph verlangt Stücke, die ein Vielfaches von 320 KiB sind. */
export const CHUNK = 320 * 1024 * 32; // 10 MiB

export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType?: string };
}

/** Die Bereiche, in denen eine Datei hochgeladen wird: [erstes, letztes] Byte. */
export function chunkRanges(total: number, chunk = CHUNK): [number, number][] {
  if (total <= 0) return [];
  const ranges: [number, number][] = [];
  for (let start = 0; start < total; start += chunk) {
    ranges.push([start, Math.min(start + chunk, total) - 1]);
  }
  return ranges;
}

/**
 * Eine Datei nach SharePoint laden. `onProgress` bekommt einen Anteil 0…1.
 *
 * Ein Stück, das scheitert, wird bis zu dreimal neu geschickt. Bei einer
 * 466-MB-Datei über ein Vereinsheim-WLAN ist ein einzelner Aussetzer kein
 * Grund, von vorn anzufangen.
 */
export async function uploadToSharePoint(
  file: File,
  epoch: string,
  onProgress: (fraction: number) => void,
  fetchImpl: typeof fetch = fetch
): Promise<DriveItem> {
  const { uploadUrl } = await invokeFunction<{ uploadUrl: string }>("sharepoint-files", {
    body: { action: "upload-session", fileName: file.name, epoch },
  });

  const ranges = chunkRanges(file.size);
  if (ranges.length === 0) throw new Error("Die Datei ist leer.");

  for (const [start, end] of ranges) {
    let response: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Keine Anmeldung an diese Adresse: Sie gilt von selbst, und Graph
        // lehnt einen Authorization-Kopf dort ab.
        response = await fetchImpl(uploadUrl, {
          method: "PUT",
          headers: { "Content-Range": `bytes ${start}-${end}/${file.size}` },
          body: file.slice(start, end + 1),
        });
        if (response.status < 500) break;
      } catch {
        response = null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
    if (!response) throw new Error("Die Verbindung zu SharePoint ist abgerissen.");
    onProgress((end + 1) / file.size);
    if (response.status === 200 || response.status === 201) return (await response.json()) as DriveItem;
    if (response.status !== 202) {
      throw new Error(`SharePoint hat das Hochladen abgelehnt (${response.status}).`);
    }
  }
  throw new Error("SharePoint hat das Hochladen nicht abgeschlossen.");
}

/** Die hochgeladene Datei als neue Quelle anlegen. */
export function registerSource(input: {
  driveItemId: string;
  title: string;
  epoch: string;
  folderId: string | null;
}) {
  return invokeFunction<{ ok: boolean; id: string }>("sharepoint-files", {
    body: { action: "register", ...input },
  });
}

/** Eine hochgeladene Datei an eine bestehende Quelle hängen („Datei fehlt"). */
export function attachFile(sourceId: string, driveItemId: string) {
  return invokeFunction("sharepoint-files", { body: { action: "attach", sourceId, driveItemId } });
}

/** Adresse zum Ansehen oder Herunterladen. Gilt nur Minuten. */
export function downloadUrl(sourceId: string) {
  return invokeFunction<{ url: string; name: string; mimeType: string | null; size: number | null }>(
    "sharepoint-files",
    { body: { action: "download-url", sourceId } }
  );
}

/**
 * Adresse einer Vorschau zum Einbetten. Blättert seitenweise, deshalb auch für
 * grosse Scans – die Download-Adresse müsste erst die ganze Datei laden.
 */
export function previewUrl(sourceId: string) {
  return invokeFunction<{ url: string }>("sharepoint-files", { body: { action: "preview-url", sourceId } });
}

/** Quelle löschen; eine Datei in SharePoint geht in den Papierkorb der Website. */
export function deleteSourceWithFile(sourceId: string) {
  return invokeFunction("sharepoint-files", { body: { action: "delete", sourceId } });
}
