// SharePoint über Microsoft Graph – die Ablage für grosse Dateien.
//
// Eigene App-Registrierung, getrennt von der für den Mailversand: Diese hier
// darf Dateien lesen und schreiben, jene Mails verschicken. Ein
// durchgesickertes Geheimnis soll nicht beides öffnen. Das Recht ist
// `Sites.Selected` – die App sieht genau die eine Website, für die ein Admin
// sie freigegeben hat, und sonst nichts im Tenant (docs/sharepoint.md).
//
// Alles liegt unter einem Ordner der Dokumentbibliothek der Website
// (FOLDER). Die Funktionen prüfen bei jeder Datei, dass sie dort liegt: Die
// Kennung einer Datei kommt vom Browser, und ohne diese Prüfung liesse sich
// damit jede Datei der Website herunterladen oder löschen.

export const FOLDER = "Quellensammlung";

/**
 * Der Eingangskorb: Wer viele oder sehr grosse Dateien hat, legt sie mit dem
 * Explorer oder im Browser in SharePoint ab, statt sie einzeln über die
 * Website hochzuladen. In DING tauchen sie dann zum Zuordnen auf und wandern
 * dabei in die Quellensammlung.
 */
export const INBOX = "Posteingang";

/** Stückgrösse beim Hochladen. Graph verlangt ein Vielfaches von 320 KiB. */
export const CHUNK = 320 * 1024 * 32; // 10 MiB

const GRAPH = "https://graph.microsoft.com/v1.0";

export interface SharePointTarget {
  siteId: string;
  siteName: string;
  driveId: string;
  driveName: string;
}

export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  parentReference?: { path?: string };
  "@microsoft.graph.downloadUrl"?: string;
}

/** Eine Datei im Eingangskorb, mit ihrem Weg ab der Bibliothek. */
export interface UnsortedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string | null;
}

/**
 * Der Mandant – eure Microsoft-365-Organisation. Für Mailversand und Ablage
 * ist das derselbe, deshalb reicht `MS_TENANT_ID`, wenn der Mailversand schon
 * eingerichtet ist. Anwendungs-ID und Geheimnis bleiben getrennt: Das hier ist
 * eine eigene App mit eigenen Rechten.
 */
function tenantId(): string {
  return Deno.env.get("SHAREPOINT_TENANT_ID") || Deno.env.get("MS_TENANT_ID") || "";
}

/** Welche Geheimnisse fehlen – für eine Meldung, mit der man etwas anfangen kann. */
export function missingSecrets(): string[] {
  const fehlt = ["SHAREPOINT_CLIENT_ID", "SHAREPOINT_CLIENT_SECRET"].filter((n) => !Deno.env.get(n));
  if (!tenantId()) fehlt.unshift("SHAREPOINT_TENANT_ID");
  return fehlt;
}

let token: { value: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.until) return token.value;
  const fehlt = missingSecrets();
  if (fehlt.length > 0) {
    throw new Error(`SharePoint ist nicht eingerichtet. Es fehlt: ${fehlt.join(", ")}.`);
  }
  const tenant = tenantId();
  const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("SHAREPOINT_CLIENT_ID")!,
      client_secret: Deno.env.get("SHAREPOINT_CLIENT_SECRET")!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!resp.ok) {
    throw new Error(`Anmeldung bei Microsoft fehlgeschlagen: ${await graphReason(resp)}`);
  }
  const data = await resp.json();
  // Eine Minute Luft, damit kein Aufruf mit einem gerade ablaufenden Schlüssel startet.
  token = { value: data.access_token, until: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return token.value;
}

/** Die Meldung aus einer Antwort von Graph, ohne den ganzen Rumpf. */
async function graphReason(resp: Response): Promise<string> {
  try {
    const body = await resp.json();
    return body?.error?.message ?? body?.error_description ?? `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status}`;
  }
}

export async function graph(path: string, init: RequestInit = {}): Promise<Response> {
  const resp = await fetch(path.startsWith("http") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  return resp;
}

async function graphJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await graph(path, init);
  if (!resp.ok) throw new Error(`SharePoint: ${await graphReason(resp)}`);
  return await resp.json() as T;
}

const targets = new Map<string, { target: SharePointTarget; until: number }>();

/**
 * Website und Dokumentbibliothek zu einer Adresse wie
 * https://verein.sharepoint.com/sites/Vereinsablage.
 */
export async function resolveTarget(siteUrl: string): Promise<SharePointTarget> {
  const cached = targets.get(siteUrl);
  if (cached && Date.now() < cached.until) return cached.target;

  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    throw new Error("Die Adresse der SharePoint-Website ist keine gültige Adresse.");
  }
  if (!url.hostname.endsWith(".sharepoint.com")) {
    throw new Error("Die Adresse muss auf .sharepoint.com enden, etwa https://verein.sharepoint.com/sites/Ablage.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  const site = await graphJson<{ id: string; displayName: string }>(
    `/sites/${url.hostname}:${path || "/"}`
  );
  const drive = await graphJson<{ id: string; name: string }>(`/sites/${site.id}/drive`);
  const target = { siteId: site.id, siteName: site.displayName, driveId: drive.id, driveName: drive.name };
  targets.set(siteUrl, { target, until: Date.now() + 10 * 60 * 1000 });
  return target;
}

/**
 * Ein Ordner in der Bibliothek, angelegt, falls es ihn noch nicht gibt.
 * `unter` ist der Weg zum Elternordner, leer für die oberste Ebene.
 *
 * Nie „replace": Das ersetzte in SharePoint einen gleichnamigen Ordner samt
 * Inhalt. Legen zwei Aufrufe ihn gleichzeitig an, gewinnt einer, der andere
 * holt sich den vorhandenen.
 */
export async function ensureFolder(
  target: SharePointTarget,
  name = FOLDER,
  unter = ""
): Promise<DriveItem> {
  const weg = (unter ? [...unter.split("/"), name] : [name]).map(encodeURIComponent).join("/");
  const holen = () => graph(`/drives/${target.driveId}/root:/${weg}`);

  const da = await holen();
  if (da.ok) return await da.json() as DriveItem;
  if (da.status !== 404) throw new Error(`SharePoint: ${await graphReason(da)}`);

  const eltern = unter
    ? `/drives/${target.driveId}/root:/${unter.split("/").map(encodeURIComponent).join("/")}:/children`
    : `/drives/${target.driveId}/root/children`;
  const angelegt = await graph(eltern, {
    method: "POST",
    body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  });
  if (angelegt.ok) return await angelegt.json() as DriveItem;
  if (angelegt.status === 409) {
    const nochmal = await holen();
    if (nochmal.ok) return await nochmal.json() as DriveItem;
  }
  throw new Error(`SharePoint: ${await graphReason(angelegt)}`);
}

/**
 * Alles, was in der Bibliothek liegt, aber nicht in der Quellensammlung –
 * der Eingangskorb. Absichtlich nicht nur `Posteingang`: Wer seine Dateien
 * in einen anders benannten Ordner gelegt hat, soll sie trotzdem
 * wiederfinden. Ordner bis zu vier Ebenen tief, höchstens `max` Dateien,
 * damit eine grosse Bibliothek die Funktion nicht sprengt.
 */
export async function listUnsorted(target: SharePointTarget, max = 300): Promise<UnsortedFile[]> {
  const gefunden: UnsortedFile[] = [];

  const besuche = async (relativ: string, tiefe: number): Promise<void> => {
    if (gefunden.length >= max || tiefe > 4) return;
    const adresse = relativ === ""
      ? `/drives/${target.driveId}/root/children`
      : `/drives/${target.driveId}/root:/${relativ.split("/").map(encodeURIComponent).join("/")}:/children`;
    const { value } = await graphJson<{ value: DriveItem[] }>(
      `${adresse}?$select=id,name,size,file,folder&$top=200`
    );
    for (const eintrag of value) {
      if (gefunden.length >= max) return;
      const weg = relativ === "" ? eintrag.name : `${relativ}/${eintrag.name}`;
      if (eintrag.folder) {
        if (relativ === "" && eintrag.name === FOLDER) continue; // die Ablage selbst
        await besuche(weg, tiefe + 1);
      } else if (eintrag.file) {
        gefunden.push({
          id: eintrag.id,
          name: eintrag.name,
          path: weg,
          size: eintrag.size ?? 0,
          mimeType: eintrag.file.mimeType ?? null,
        });
      }
    }
  };

  await besuche("", 0);
  return gefunden;
}

/**
 * Eine Datei aus dem Eingangskorb in die Quellensammlung schieben.
 * Erst dort gilt sie als zugeordnet – danach greifen dieselben Prüfungen wie
 * für jede andere Datei der Ablage.
 */
export async function moveIntoCollection(
  target: SharePointTarget,
  itemId: string,
  epoch: string
): Promise<DriveItem> {
  const item = await graphJson<DriveItem>(
    `/drives/${target.driveId}/items/${encodeURIComponent(itemId)}` +
      "?$select=id,name,size,file,parentReference"
  );
  if (!item.file) throw new Error("Das ist keine Datei, sondern ein Ordner.");
  if (isInFolder(item.parentReference?.path)) return item; // liegt schon richtig

  await ensureFolder(target);
  const ziel = await ensureFolder(target, safeSegment(epoch), FOLDER);
  return await graphJson<DriveItem>(`/drives/${target.driveId}/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      parentReference: { id: ziel.id },
      name: safeFileName(item.name),
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });
}

/** Zeichen, die SharePoint in Dateinamen nicht annimmt. Umlaute bleiben. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/["*:<>?/\\|#%]/g, "_").replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 180);
  return cleaned || "Datei";
}

/** Ein Ordnername aus einer Epoche: nur Buchstaben, Ziffern, Bindestrich, Unterstrich. */
export function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 60) || "allgemein";
}

/**
 * Eine Hochladesitzung. Die Adresse darin gilt ohne Anmeldung – der Browser
 * lädt direkt zu Microsoft, an Supabase vorbei. Deshalb spielt die Grösse
 * der Datei für Supabase keine Rolle.
 */
export async function createUploadSession(
  target: SharePointTarget,
  subfolder: string,
  fileName: string
): Promise<string> {
  const path = [FOLDER, safeSegment(subfolder), `${Date.now()}_${safeFileName(fileName)}`]
    .map(encodeURIComponent).join("/");
  const session = await graphJson<{ uploadUrl: string }>(
    `/drives/${target.driveId}/root:/${path}:/createUploadSession`,
    { method: "POST", body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }) }
  );
  return session.uploadUrl;
}

/**
 * Eine Datei, aber nur, wenn sie unter FOLDER liegt.
 * Mit Download-Adresse, die ohne Anmeldung gilt und nach Minuten verfällt.
 *
 * Ohne `$select`: Die Download-Adresse ist keine Eigenschaft, sondern eine
 * Anmerkung an der Antwort (`@microsoft.graph.downloadUrl`). Steht sie in
 * einer Auswahlliste, lässt Graph sie stillschweigend weg – die Antwort kam
 * ohne sie, und jede Vorschau endete mit „SharePoint hat keine
 * Download-Adresse geliefert".
 */
export async function fileInFolder(target: SharePointTarget, itemId: string): Promise<DriveItem> {
  const item = await graphJson<DriveItem>(
    `/drives/${target.driveId}/items/${encodeURIComponent(itemId)}`
  );
  if (!isInFolder(item.parentReference?.path)) {
    throw new Error("Diese Datei gehört nicht zur Ablage der Quellensammlung.");
  }
  return item;
}

/**
 * Eine Vorschau zum Einbetten, so wie SharePoint sie selbst zeigt.
 *
 * Die Download-Adresse taugt dafür nicht: SharePoint schickt die Datei zum
 * Speichern, nicht zum Anzeigen, und ein Scan von 466 MB müsste im Browser
 * erst ganz geladen werden. Die Vorschau blättert seitenweise, kann PDF,
 * Word, Excel und PowerPoint und gilt ohne Anmeldung für kurze Zeit.
 */
export async function previewUrl(target: SharePointTarget, itemId: string): Promise<string> {
  await fileInFolder(target, itemId);
  const antwort = await graphJson<{ getUrl?: string }>(
    `/drives/${target.driveId}/items/${encodeURIComponent(itemId)}/preview`,
    { method: "POST", body: JSON.stringify({}) }
  );
  if (!antwort.getUrl) throw new Error("SharePoint hat für diese Datei keine Vorschau geliefert.");
  return antwort.getUrl;
}

/**
 * Liegt ein Eltern-Pfad wie `/drives/…/root:/Quellensammlung/mittelalter`
 * unter FOLDER? Genau dieser Ordner oder darunter – nicht
 * „QuellensammlungPrivat", nicht ein Ordner gleichen Namens tiefer in der
 * Bibliothek.
 */
export function isInFolder(parentPath: string | undefined): boolean {
  let path = parentPath ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    return false;
  }
  const marker = path.indexOf("/root:");
  if (marker < 0) return false;
  const below = path.slice(marker + "/root:".length);
  return below === `/${FOLDER}` || below.startsWith(`/${FOLDER}/`);
}

/** In den Papierkorb der Website – dort lässt sie sich 93 Tage wiederherstellen. */
export async function deleteFile(target: SharePointTarget, itemId: string): Promise<void> {
  await fileInFolder(target, itemId);
  const resp = await graph(`/drives/${target.driveId}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
  if (!resp.ok && resp.status !== 404) throw new Error(`SharePoint: ${await graphReason(resp)}`);
}

/** Hochladen vom Server aus, in Stücken – für das Verschieben aus Supabase. */
export async function uploadBytes(uploadUrl: string, bytes: Uint8Array): Promise<DriveItem> {
  const total = bytes.byteLength;
  if (total === 0) throw new Error("Die Datei ist leer.");
  for (let start = 0; start < total; start += CHUNK) {
    const end = Math.min(start + CHUNK, total) - 1;
    // Keine Anmeldung an die Hochladeadresse schicken – Graph lehnt das ab.
    const resp = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end}/${total}` },
      // Die Typen von TypeScript 6 trennen Uint8Array nach Art des Puffers;
      // fetch nimmt diesen hier ohne Weiteres.
      body: bytes.subarray(start, end + 1) as BodyInit,
    });
    if (resp.status === 200 || resp.status === 201) return await resp.json() as DriveItem;
    if (resp.status !== 202) throw new Error(`Hochladen nach SharePoint: ${await graphReason(resp)}`);
  }
  throw new Error("Hochladen nach SharePoint: Die letzte Antwort fehlte.");
}
