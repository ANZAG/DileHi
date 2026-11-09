import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requirePermission } from "../_shared/authz.ts";
import {
  graph, graphJson, graphReason, isInFolder, missingSecrets, resolveTarget, type SharePointTarget,
} from "../_shared/sharepoint.ts";

/**
 * Der Ordner der Wissensbibliothek in SharePoint.
 *
 * Gepflegt wird die Bibliothek als Ordner – Markdown-Dateien und Bilder –,
 * synchronisiert auf die Rechner der Pflegenden. Diese Funktion liest ihn und
 * stellt Bildadressen aus; die Datenbank hält die Texte und weiss, welche
 * Datei zu welchem Bildpfad gehört (library_images).
 *
 * Eigene Website, getrennt von der Quellensammlung, aber dieselbe
 * App-Registrierung. Sie muss für diese Website eigens freigegeben sein
 * (Sites.Selected), sonst antwortet Graph mit 403.
 *
 * Aktionen (POST, JSON mit `action`):
 *   status  Website und Ordner erreichbar? Braucht library.manage.
 *   scan    Alle Dateien des Ordners; Markdown mit Inhalt, Bilder mit Grösse.
 *           Braucht library.manage.
 *   urls    Adressen für Bildpfade: ganze Datei und Vorschau (800 px), gültig
 *           für Minuten. Wer die Bibliothek nicht lesen darf, bekommt keine –
 *           die Pfade werden mit dem Schlüssel des Aufrufers nachgeschlagen.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class Refusal extends Error {
  constructor(message: string, readonly status = 403) {
    super(message);
  }
}

interface Item {
  id: string;
  name: string;
  eTag?: string;
  size?: number;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  image?: { width?: number; height?: number };
  parentReference?: { path?: string };
  thumbnails?: { large?: { url?: string }; medium?: { url?: string } }[];
  "@microsoft.graph.downloadUrl"?: string;
}

/** Eine Datei im Ordner, mit dem Weg ab dem Ordner der Bibliothek. */
interface Datei {
  id: string;
  path: string;
  size: number;
  etag: string | null;
  modified: string | null;
  width: number | null;
  height: number | null;
  text?: string;
}

const MARKDOWN = /\.md$/i;
const BILD = /\.(jpe?g|png|webp|gif)$/i;
/** Obergrenze, damit ein versehentlich falsch gesetzter Ordner die Funktion nicht sprengt. */
const MAX_DATEIEN = 5000;

const ordnerweg = (folder: string) =>
  folder.split("/").filter(Boolean).map(encodeURIComponent).join("/");

/** Höchstens `n` gleichzeitig. */
async function nebenlaeufig<T>(liste: T[], n: number, f: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, liste.length) }, async () => {
    while (i < liste.length) await f(liste[i++]);
  }));
}

/** Alle Dateien unter dem Ordner. Unterordner, die mit _ beginnen, bleiben aussen vor. */
async function auflisten(target: SharePointTarget, folder: string): Promise<{ dateien: Datei[]; downloads: Map<string, string> }> {
  const dateien: Datei[] = [];
  const downloads = new Map<string, string>();

  const besuche = async (relativ: string, tiefe: number): Promise<void> => {
    if (tiefe > 6 || dateien.length >= MAX_DATEIEN) return;
    const weg = [ordnerweg(folder), ...relativ.split("/").filter(Boolean).map(encodeURIComponent)].join("/");
    // Ohne $select: Sonst fehlt die Download-Adresse (siehe fileInFolder).
    let adresse: string | undefined = `/drives/${target.driveId}/root:/${weg}:/children?$top=200`;
    const unterordner: string[] = [];
    while (adresse) {
      const seite: { value: Item[]; "@odata.nextLink"?: string } = await graphJson(adresse);
      for (const e of seite.value) {
        const pfad = relativ ? `${relativ}/${e.name}` : e.name;
        if (e.folder) {
          if (!e.name.startsWith("_")) unterordner.push(pfad);
        } else if (e.file && (MARKDOWN.test(e.name) || BILD.test(e.name))) {
          dateien.push({
            id: e.id,
            path: pfad,
            size: e.size ?? 0,
            etag: e.eTag ?? null,
            modified: e.lastModifiedDateTime ?? null,
            width: e.image?.width ?? null,
            height: e.image?.height ?? null,
          });
          const url = e["@microsoft.graph.downloadUrl"];
          if (url && MARKDOWN.test(e.name)) downloads.set(e.id, url);
        }
      }
      adresse = seite["@odata.nextLink"];
    }
    for (const u of unterordner) await besuche(u, tiefe + 1);
  };

  await besuche("", 0);
  return { dateien, downloads };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Refusal("Nicht angemeldet.", 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Refusal("Nicht angemeldet.", 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const { data: einstellung } = await admin.from("library_settings").select("site_url, folder").maybeSingle();
    const siteUrl = (einstellung?.site_url as string | null) ?? "";
    const folder = String(einstellung?.folder ?? "Bibliothek").replace(/^\/+|\/+$/g, "");

    const target = async () => {
      if (!siteUrl) throw new Refusal("Für die Wissensbibliothek ist noch keine SharePoint-Website eingetragen (Pflege → Ablage).", 409);
      const fehlt = missingSecrets();
      if (fehlt.length) throw new Refusal(`SharePoint ist nicht eingerichtet. Es fehlt: ${fehlt.join(", ")}.`, 409);
      try {
        return await resolveTarget(siteUrl);
      } catch (e) {
        const meldung = e instanceof Error ? e.message : String(e);
        throw new Refusal(
          /access denied|forbidden|403/i.test(meldung)
            ? "DING darf diese Website nicht lesen. Sie muss für die App eigens freigegeben werden (docs/wissensbibliothek-standard.md, Abschnitt 6)."
            : meldung,
          502
        );
      }
    };
    const pflege = () =>
      requirePermission(admin, user.id, "library.manage", "Dafür braucht es das Recht „Wissensbibliothek pflegen“.");

    switch (action) {
      case "status": {
        await pflege();
        const t = await target();
        const resp = await graph(`/drives/${t.driveId}/root:/${ordnerweg(folder)}`);
        if (resp.status === 404) {
          return json(200, { ok: false, site: t.siteName, folder, meldung: `Den Ordner „${folder}“ gibt es in „${t.driveName}“ nicht.` });
        }
        if (!resp.ok) throw new Error(`SharePoint: ${await graphReason(resp)}`);
        const item = await resp.json() as Item;
        return json(200, { ok: true, site: t.siteName, library: t.driveName, folder, entries: item.folder?.childCount ?? null });
      }

      case "scan": {
        await pflege();
        const t = await target();
        const { dateien, downloads } = await auflisten(t, folder);
        // Markdown gleich mitliefern: Das sind ein paar Kilobyte je Datei, und
        // der Browser braucht sie alle, um zu wissen, was es gibt.
        await nebenlaeufig(dateien.filter((d) => downloads.has(d.id)), 8, async (d) => {
          const resp = await fetch(downloads.get(d.id)!);
          if (resp.ok) d.text = await resp.text();
        });
        return json(200, { site: t.siteName, folder, files: dateien });
      }

      case "urls": {
        const pfade = (Array.isArray(body.paths) ? body.paths : []).map(String).slice(0, 100);
        if (!pfade.length) return json(200, { urls: {} });
        // Mit dem Schlüssel des Aufrufers: Ohne Leserecht kommt hier nichts zurück.
        const { data: bilder, error } = await asUser.from("library_images").select("path, item_id").in("path", pfade);
        if (error) throw new Error(error.message);
        if (!bilder?.length) return json(200, { urls: {} });
        const t = await target();
        const urls: Record<string, { full: string; preview: string | null }> = {};

        for (let i = 0; i < bilder.length; i += 20) {
          const teil = bilder.slice(i, i + 20) as { path: string; item_id: string }[];
          const antwort = await graphJson<{ responses: { id: string; status: number; body: Item }[] }>("/$batch", {
            method: "POST",
            body: JSON.stringify({
              requests: teil.map((b, n) => ({
                id: String(n),
                method: "GET",
                url: `/drives/${t.driveId}/items/${encodeURIComponent(b.item_id)}?$expand=thumbnails`,
              })),
            }),
          });
          for (const r of antwort.responses) {
            const b = teil[Number(r.id)];
            const item = r.body;
            // Die Kennung stammt aus der Datenbank, aber geprüft wird trotzdem:
            // Nur was im Ordner der Bibliothek liegt, bekommt eine Adresse.
            if (r.status !== 200 || !isInFolder(item.parentReference?.path, folder)) continue;
            const full = item["@microsoft.graph.downloadUrl"];
            if (!full) continue;
            urls[b.path] = { full, preview: item.thumbnails?.[0]?.large?.url ?? null };
          }
        }
        return json(200, { urls });
      }

      default:
        throw new Refusal(`Unbekannte Aktion „${action}“.`, 400);
    }
  } catch (e) {
    const status = e instanceof Refusal ? e.status : 500;
    return json(status, { error: e instanceof Error ? e.message : String(e) });
  }
});
