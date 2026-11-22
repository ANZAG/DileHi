import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteFile, fileInFolder, graph, graphJson, graphReason, INBOX, isInFolder, resolveTarget, type DriveItem } from "../_shared/sharepoint.ts";

/**
 * Werkstatt für vorhandene Quellen – aufgerufen von der GitHub-Action
 * „Quellen nachbearbeiten“ (scripts/quellen-nachbearbeiten.ts), die keine
 * Sitzung hat.
 *
 * Abgesichert über ein eigenes gemeinsames Geheimnis (QUELLEN_TOKEN, Kopf
 * `x-quellen-token`) – nicht dasselbe wie für Sicherung oder
 * Zusammenfassung: Diese Funktion kann den Text der Quellen setzen und ihre
 * Dateien ersetzen.
 *
 * Die Dateien selbst laufen nicht durch diese Funktion: Sie gibt nur
 * Adressen heraus – zum Herunterladen (gilt Minuten, ohne Anmeldung) und
 * zum Hochladen einer neuen Fassung derselben Datei. SharePoint behält die
 * alte Fassung im Versionsverlauf.
 *
 * Aktionen (POST, JSON mit `action`):
 *   liste             Alle Quellen mit Datei in SharePoint, mit der Zahl der
 *                     Seiten, die schon Text in der Suche haben.
 *   download          Download-Adresse der Datei einer Quelle.
 *   text              Text je Seite in die Suche (ersetzt, was da war).
 *   ersetzen-sitzung  Hochladeadresse für eine neue Fassung der Datei.
 *   ersetzt           Nach dem Hochladen: Grösse und Namen nachtragen.
 *   versionen         Versionsverlauf der Datei (neueste zuerst).
 *   wiederherstellen  Eine frühere Fassung (versionId) wieder zur aktuellen
 *                     machen – SharePoint legt dafür eine neue Fassung an,
 *                     nichts geht verloren. Grösse wird nachgetragen.
 *   eingang           Die PDFs im Posteingang (neueste zuerst).
 *   eingang-download  Download-Adresse einer Datei im Posteingang.
 *   seiten-text       Text nur für einzelne Seiten setzen ({ seite: text }).
 *   doppelt-loeschen  Eine doppelt angelegte Quelle entfernen – nur, wenn es
 *                     eine ältere mit gleichem Titel und gleicher Grösse
 *                     gibt. Die Datei geht in den Papierkorb der Website
 *                     (93 Tage wiederherstellbar).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-quellen-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const erwartet = Deno.env.get("QUELLEN_TOKEN");
  if (!erwartet || req.headers.get("x-quellen-token") !== erwartet) return json(401, { error: "Nicht berechtigt" });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const target = async () => {
      const { data } = await admin.from("app_settings").select("sharepoint_site_url").maybeSingle();
      const site = (data?.sharepoint_site_url as string | null) ?? "";
      if (!site) throw new Error("Es ist keine SharePoint-Website eingetragen.");
      return await resolveTarget(site);
    };
    const quelle = async () => {
      const { data } = await admin.from("sources")
        .select("id, title, drive_item_id, file_name, file_size").eq("id", String(body.sourceId ?? "")).maybeSingle();
      if (!data?.drive_item_id) throw new Error("Diese Quelle hat keine Datei in SharePoint.");
      return data as { id: string; title: string; drive_item_id: string; file_name: string | null; file_size: number | null };
    };

    switch (action) {
      case "liste": {
        const { data: quellen, error } = await admin.from("sources")
          .select("id, title, epoch, file_name, file_size, mime_type, drive_item_id")
          .not("drive_item_id", "is", null).order("created_at");
        if (error) throw error;
        const { data: dateien } = await admin.rpc("source_text_files");
        const seiten = new Map(((dateien ?? []) as { file_key: string; pages: number }[]).map((d) => [d.file_key, d.pages]));
        return json(200, { quellen: (quellen ?? []).map((q) => ({ ...q, textSeiten: seiten.get(q.drive_item_id as string) ?? 0 })) });
      }

      case "download": {
        const q = await quelle();
        const item = await fileInFolder(await target(), q.drive_item_id);
        const url = item["@microsoft.graph.downloadUrl"];
        if (!url) throw new Error("SharePoint hat keine Download-Adresse geliefert.");
        return json(200, { url, name: item.name, size: item.size ?? null });
      }

      case "text": {
        const q = await quelle();
        const seiten = Array.isArray(body.seiten) ? (body.seiten as unknown[]).map((s) => String(s ?? "")) : null;
        if (!seiten) throw new Error("Es fehlen die Seiten.");
        if (seiten.length > 5000) throw new Error("Mehr als 5000 Seiten nimmt die Suche nicht an.");
        const { error: weg } = await admin.from("source_pages").delete().eq("file_key", q.drive_item_id);
        if (weg) throw weg;
        for (let i = 0; i < seiten.length; i += 200) {
          const { error } = await admin.from("source_pages").insert(
            seiten.slice(i, i + 200).map((t, j) => ({ file_key: q.drive_item_id, page: i + j + 1, body: t.slice(0, 200000), created_by: null }))
          );
          if (error) throw error;
        }
        return json(200, { seiten: seiten.length });
      }

      case "ersetzen-sitzung": {
        const q = await quelle();
        const t = await target();
        await fileInFolder(t, q.drive_item_id);
        // Dieselbe Datei (gleiche Kennung): SharePoint legt eine neue Fassung an.
        const s = await graphJson<{ uploadUrl: string }>(
          `/drives/${t.driveId}/items/${encodeURIComponent(q.drive_item_id)}/createUploadSession`,
          { method: "POST", body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } }) }
        );
        return json(200, { uploadUrl: s.uploadUrl });
      }

      case "ersetzt": {
        const q = await quelle();
        const item = await fileInFolder(await target(), q.drive_item_id);
        await admin.from("sources").update({ file_size: item.size ?? null, file_name: item.name ?? q.file_name }).eq("id", q.id);
        return json(200, { size: item.size ?? null });
      }

      case "versionen": {
        const q = await quelle();
        const t = await target();
        const v = await graphJson<{ value: { id: string; lastModifiedDateTime?: string; size?: number }[] }>(
          `/drives/${t.driveId}/items/${encodeURIComponent(q.drive_item_id)}/versions`
        );
        return json(200, { versionen: v.value.map((x) => ({ id: x.id, zeit: x.lastModifiedDateTime ?? null, size: x.size ?? null })) });
      }

      case "wiederherstellen": {
        const q = await quelle();
        const t = await target();
        const vid = String(body.versionId ?? "");
        if (!vid) throw new Error("Es fehlt die Version.");
        const resp = await graph(
          `/drives/${t.driveId}/items/${encodeURIComponent(q.drive_item_id)}/versions/${encodeURIComponent(vid)}/restoreVersion`,
          { method: "POST" }
        );
        if (!resp.ok) throw new Error(`SharePoint: ${await graphReason(resp)}`);
        const item = await fileInFolder(t, q.drive_item_id);
        await admin.from("sources").update({ file_size: item.size ?? null }).eq("id", q.id);
        return json(200, { size: item.size ?? null });
      }

      case "eingang": {
        const t = await target();
        const r = await graph(
          `/drives/${t.driveId}/root:/${encodeURIComponent(INBOX)}:/children?$select=id,name,size,file,createdDateTime&$top=200`
        );
        if (r.status === 404) return json(200, { dateien: [] });
        if (!r.ok) throw new Error(`SharePoint: ${await graphReason(r)}`);
        const { value } = await r.json() as { value: (DriveItem & { createdDateTime?: string })[] };
        const dateien = value.filter((d) => d.file && /\.pdf$/i.test(d.name))
          .map((d) => ({ id: d.id, name: d.name, size: d.size ?? null, zeit: d.createdDateTime ?? null }))
          .sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
        return json(200, { dateien });
      }

      case "eingang-download": {
        const t = await target();
        const item = await graphJson<DriveItem>(`/drives/${t.driveId}/items/${encodeURIComponent(String(body.itemId ?? ""))}`);
        if (!isInFolder(item.parentReference?.path, INBOX)) throw new Error("Diese Datei liegt nicht im Posteingang.");
        const url = item["@microsoft.graph.downloadUrl"];
        if (!url) throw new Error("SharePoint hat keine Download-Adresse geliefert.");
        return json(200, { url, name: item.name });
      }

      case "seiten-text": {
        const q = await quelle();
        const seiten = (body.seiten ?? {}) as Record<string, unknown>;
        const nummern = Object.keys(seiten).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5000);
        if (!nummern.length) throw new Error("Es fehlen die Seiten.");
        const { error: weg } = await admin.from("source_pages").delete().eq("file_key", q.drive_item_id).in("page", nummern);
        if (weg) throw weg;
        const { error } = await admin.from("source_pages").insert(
          nummern.map((n) => ({ file_key: q.drive_item_id, page: n, body: String(seiten[String(n)] ?? "").slice(0, 200000), created_by: null }))
        );
        if (error) throw error;
        return json(200, { seiten: nummern.length });
      }

      case "doppelt-loeschen": {
        const q = await quelle();
        const { data: ich } = await admin.from("sources").select("created_at").eq("id", q.id).single();
        const { data: andere } = await admin.from("sources").select("id, drive_item_id")
          .eq("title", q.title).eq("file_size", q.file_size ?? -1).neq("id", q.id)
          .lt("created_at", ich!.created_at as string).not("drive_item_id", "is", null);
        const bleibt = (andere ?? []).find((a) => a.drive_item_id !== q.drive_item_id);
        if (!bleibt) throw new Error("Keine ältere Quelle mit gleichem Titel und gleicher Grösse – nicht gelöscht.");
        const { count } = await admin.from("library_sources").select("*", { count: "exact", head: true }).eq("collection_source_id", q.id);
        if (count) throw new Error("Auf diese Quelle wird verwiesen – nicht gelöscht.");
        await admin.from("source_pages").delete().eq("file_key", q.drive_item_id);
        const { error } = await admin.from("sources").delete().eq("id", q.id);
        if (error) throw error;
        await deleteFile(await target(), q.drive_item_id);
        return json(200, { geloescht: q.id, bleibt: bleibt.id });
      }

      default:
        return json(400, { error: `Unbekannte Aktion: ${action}` });
    }
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
