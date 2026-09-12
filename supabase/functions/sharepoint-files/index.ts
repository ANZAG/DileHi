import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requirePermission } from "../_shared/authz.ts";
import {
  createUploadSession, deleteFile, ensureFolder, fileInFolder, FOLDER, INBOX, listUnsorted,
  missingSecrets, moveIntoCollection, resolveTarget, uploadBytes, type DriveItem,
} from "../_shared/sharepoint.ts";

/**
 * Die Dateien der Quellensammlung in SharePoint.
 *
 * Die Datei selbst läuft nie durch diese Funktion: Hochgeladen wird vom
 * Browser direkt zu Microsoft (über eine Hochladeadresse, die diese Funktion
 * besorgt), heruntergeladen über eine Adresse, die nur Minuten gilt. Hier
 * wird nur geprüft, wer was darf, und die Quelle in der Datenbank gepflegt.
 * Deshalb spielen weder Dateigrösse noch Laufzeitgrenzen der Edge Functions
 * eine Rolle – bis auf „move", das eine Datei aus dem Supabase-Speicher
 * herüberträgt und dort nur Dateien bis 25 MB findet.
 *
 * Wer was darf, entscheiden dieselben Regeln wie für die Tabelle `sources`:
 * sehen und hochladen alle Mitglieder, löschen und ändern nur, wer die Quelle
 * angelegt hat. Die Einstellungen und das Verschieben brauchen
 * `system.integrations`.
 *
 * Aktionen (POST, JSON mit `action`):
 *   status          Ist SharePoint erreichbar? Für die Verwaltung.
 *   settings        Ablage umschalten und Website eintragen.
 *   upload-session  Hochladeadresse für eine neue Datei.
 *   register        Die hochgeladene Datei als Quelle anlegen.
 *   attach          Eine hochgeladene Datei an eine bestehende Quelle hängen.
 *   download-url    Adresse zum Ansehen oder Herunterladen.
 *   delete          Quelle löschen, die Datei geht in den Papierkorb der Website.
 *   move            Eine Datei aus dem Supabase-Speicher nach SharePoint tragen.
 *   inbox           Was im Eingangskorb liegt und noch zu keiner Quelle gehört.
 *   claim           Eine Datei aus dem Eingangskorb einer Quelle zuordnen.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

class Refusal extends Error {
  constructor(message: string, readonly status = 403) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Refusal("Nicht angemeldet.", 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    // Mit dem Schlüssel des Aufrufers: Dann gelten die Regeln der Datenbank,
    // und niemand kann über diese Funktion mehr, als er ohnehin darf.
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Refusal("Nicht angemeldet.", 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const { data: settings } = await admin
      .from("app_settings").select("sharepoint_site_url").maybeSingle();
    const siteUrl = (settings?.sharepoint_site_url as string | null) ?? "";

    const target = async () => {
      if (!siteUrl) throw new Refusal("Es ist noch keine SharePoint-Website eingetragen (Verwaltung → Dateiablage).", 409);
      return await resolveTarget(siteUrl);
    };

    const requireMember = async () => {
      const { data } = await admin.rpc("is_member", { _user_id: user.id });
      if (data !== true) throw new Refusal("Nur für Mitglieder.");
    };

    switch (action) {
      case "status": {
        await requirePermission(admin, user.id, "system.integrations", "Keine Berechtigung für die Dateiablage.");
        const fehlt = missingSecrets();
        if (fehlt.length > 0) return json(200, { ok: false, fehler: `Es fehlen die Geheimnisse ${fehlt.join(", ")}.` });
        // Geprüft wird die mitgeschickte Adresse, wenn es eine gibt – so lässt
        // sie sich testen, bevor sie gespeichert wird.
        const zuPruefen = String(body.siteUrl ?? "").trim() || siteUrl;
        if (!zuPruefen) return json(200, { ok: false, fehler: "Es ist noch keine SharePoint-Website eingetragen." });
        try {
          const t = await resolveTarget(zuPruefen);
          await ensureFolder(t);
          return json(200, { ok: true, website: t.siteName, bibliothek: t.driveName, ordner: FOLDER });
        } catch (err) {
          return json(200, { ok: false, fehler: err instanceof Error ? err.message : String(err) });
        }
      }

      case "settings": {
        // Hier und nicht über app_settings direkt: Die Vereinsangaben ändern
        // darf, wer system.settings hat; die Dateiablage gehört zu den
        // Schnittstellen. Und auf SharePoint umgeschaltet wird nur, wenn die
        // Verbindung steht – sonst scheiterte das nächste Hochladen.
        await requirePermission(admin, user.id, "system.integrations", "Keine Berechtigung für die Dateiablage.");
        const fileStorage = body.fileStorage === "sharepoint" ? "sharepoint" : "supabase";
        const newSiteUrl = String(body.siteUrl ?? "").trim().replace(/\/+$/, "") || null;
        if (fileStorage === "sharepoint") {
          if (!newSiteUrl) throw new Refusal("Für SharePoint fehlt die Adresse der Website.", 400);
          const fehlt = missingSecrets();
          if (fehlt.length > 0) throw new Refusal(`Es fehlen die Geheimnisse ${fehlt.join(", ")}.`, 409);
          await ensureFolder(await resolveTarget(newSiteUrl));
        }
        const { error } = await admin.from("app_settings")
          .update({ file_storage: fileStorage, sharepoint_site_url: newSiteUrl })
          .eq("id", true);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }

      case "upload-session": {
        await requireMember();
        const fileName = String(body.fileName ?? "").trim();
        if (!fileName) throw new Refusal("Dateiname fehlt.", 400);
        const t = await target();
        await ensureFolder(t);
        const uploadUrl = await createUploadSession(t, String(body.epoch ?? ""), fileName);
        return json(200, { uploadUrl });
      }

      case "register": {
        await requireMember();
        const item = await fileInFolder(await target(), String(body.driveItemId ?? ""));
        const { data, error } = await asUser.from("sources").insert({
          epoch: String(body.epoch ?? ""),
          title: String(body.title ?? item.name).slice(0, 300),
          content: `Datei: ${item.name}`,
          folder_id: body.folderId ?? null,
          created_by: user.id,
          ...fileColumns(item),
        }).select("id").single();
        if (error) throw new Error(`Quelle nicht angelegt: ${error.message}`);
        return json(200, { ok: true, id: data.id });
      }

      case "attach": {
        const sourceId = String(body.sourceId ?? "");
        await requireOwnerOr(asUser, admin, user.id, sourceId);
        const item = await fileInFolder(await target(), String(body.driveItemId ?? ""));
        const { error } = await admin.from("sources")
          .update({ ...fileColumns(item), file_path: null, file_missing: false })
          .eq("id", sourceId);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }

      case "download-url": {
        // Lesen mit dem Schlüssel des Aufrufers: Sieht er die Quelle nicht,
        // bekommt er auch keine Datei.
        const { data: source } = await asUser.from("sources")
          .select("drive_item_id").eq("id", String(body.sourceId ?? "")).maybeSingle();
        if (!source?.drive_item_id) throw new Refusal("Diese Quelle hat keine Datei in SharePoint.", 404);
        const item = await fileInFolder(await target(), source.drive_item_id);
        const downloadUrl = item["@microsoft.graph.downloadUrl"];
        if (!downloadUrl) throw new Error("SharePoint hat keine Download-Adresse geliefert.");
        return json(200, { url: downloadUrl, name: item.name, mimeType: item.file?.mimeType ?? null, size: item.size ?? null });
      }

      case "delete": {
        const sourceId = String(body.sourceId ?? "");
        const { data: source } = await asUser.from("sources")
          .select("drive_item_id, file_path").eq("id", sourceId).maybeSingle();
        if (!source) throw new Refusal("Diese Quelle gibt es nicht.", 404);
        // Die Datenbank entscheidet, ob gelöscht werden darf – erst danach die Datei.
        const { data: deleted, error } = await asUser.from("sources").delete().eq("id", sourceId).select("id");
        if (error) throw new Error(error.message);
        if (!deleted || deleted.length === 0) throw new Refusal("Löschen darf nur, wer die Quelle angelegt hat.");
        if (source.drive_item_id) {
          await deleteFile(await target(), source.drive_item_id);
        } else if (source.file_path) {
          await admin.storage.from("internal-files").remove([source.file_path]);
        }
        return json(200, { ok: true });
      }

      case "move": {
        await requirePermission(admin, user.id, "system.integrations", "Keine Berechtigung für die Dateiablage.");
        return json(200, await moveOne(admin, await target(), String(body.sourceId ?? "")));
      }

      case "inbox": {
        // Der Eingangskorb zeigt alles, was in der Bibliothek liegt und zu
        // keiner Quelle gehört – deshalb nur für die Dateiablage-Verwaltung.
        await requirePermission(admin, user.id, "system.integrations", "Keine Berechtigung für die Dateiablage.");
        const t = await target();
        await ensureFolder(t, INBOX);
        const dateien = await listUnsorted(t);
        const { data: belegt } = await admin.from("sources")
          .select("drive_item_id").not("drive_item_id", "is", null);
        const bekannt = new Set((belegt ?? []).map((z) => z.drive_item_id as string));
        return json(200, { ordner: INBOX, dateien: dateien.filter((d) => !bekannt.has(d.id)) });
      }

      case "claim": {
        await requirePermission(admin, user.id, "system.integrations", "Keine Berechtigung für die Dateiablage.");
        const driveItemId = String(body.driveItemId ?? "");
        if (!driveItemId) throw new Refusal("Es ist keine Datei ausgewählt.", 400);
        const t = await target();
        const sourceId = String(body.sourceId ?? "");

        if (sourceId) {
          const { data: source } = await admin.from("sources")
            .select("id, epoch, drive_item_id").eq("id", sourceId).maybeSingle();
          if (!source) throw new Refusal("Diese Quelle gibt es nicht.", 404);
          if (source.drive_item_id) throw new Refusal("Diese Quelle hat schon eine Datei.", 409);
          const item = await moveIntoCollection(t, driveItemId, source.epoch ?? "");
          const { error } = await admin.from("sources")
            .update({ ...fileColumns(item), file_path: null, file_missing: false }).eq("id", sourceId);
          if (error) throw new Error(error.message);
          return json(200, { ok: true, id: sourceId, name: item.name });
        }

        const epoch = String(body.epoch ?? "").trim();
        if (!epoch) throw new Refusal("Für eine neue Quelle fehlt die Epoche.", 400);
        const item = await moveIntoCollection(t, driveItemId, epoch);
        const { data, error } = await asUser.from("sources").insert({
          epoch,
          title: String(body.title ?? item.name).slice(0, 300),
          content: `Datei: ${item.name}`,
          folder_id: body.folderId ?? null,
          created_by: user.id,
          ...fileColumns(item),
        }).select("id").single();
        if (error) throw new Error(`Quelle nicht angelegt: ${error.message}`);
        return json(200, { ok: true, id: data.id, name: item.name });
      }

      default:
        throw new Refusal(`Unbekannte Aktion: ${action || "(keine)"}`, 400);
    }
  } catch (err) {
    const status = err instanceof Refusal ? err.status : 500;
    return json(status, { error: err instanceof Error ? err.message : String(err) });
  }
});

function fileColumns(item: DriveItem) {
  return {
    drive_item_id: item.id,
    file_name: item.name,
    file_size: item.size ?? null,
    mime_type: item.file?.mimeType ?? null,
  };
}

/** Wer die Quelle angelegt hat – oder wer die Dateiablage verwaltet. */
async function requireOwnerOr(asUser: SupabaseClient, admin: SupabaseClient, userId: string, sourceId: string) {
  const { data: own } = await asUser.from("sources").select("id")
    .eq("id", sourceId).eq("created_by", userId).maybeSingle();
  if (own) return;
  await requirePermission(admin, userId, "system.integrations",
    "Eine Datei nachreichen darf, wer die Quelle angelegt hat, oder wer die Dateiablage verwaltet.");
}

/**
 * Eine Datei aus dem Supabase-Speicher nach SharePoint.
 *
 * Erst hochladen, dann die Quelle umstellen, dann im Supabase-Speicher
 * löschen – in dieser Reihenfolge geht nichts verloren, wenn unterwegs etwas
 * scheitert. Fehlt die Datei im Speicher, wird die Quelle als „Datei fehlt"
 * markiert und bleibt stehen, damit jemand sie nachreichen kann.
 */
async function moveOne(
  admin: SupabaseClient,
  target: Awaited<ReturnType<typeof resolveTarget>>,
  sourceId: string
): Promise<Record<string, unknown>> {
  const { data: source, error } = await admin.from("sources")
    .select("id, epoch, file_path, drive_item_id").eq("id", sourceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!source) throw new Refusal("Diese Quelle gibt es nicht.", 404);
  if (source.drive_item_id) return { ok: true, ergebnis: "schon_da" };
  if (!source.file_path) return { ok: true, ergebnis: "ohne_datei" };

  // Beim Umzug aus Lovable (11.09.2026) wurden Namen mit Semikolon am `;`
  // abgeschnitten: Die Speicher-Schnittstelle nimmt es in der Adresse als
  // Trennzeichen. Aus „Werk; Band 01.pdf" wurde „Werk". Findet sich der
  // volle Name nicht, deshalb der gekürzte – in SharePoint heisst die Datei
  // dann wieder richtig.
  const kandidaten = [source.file_path];
  if (source.file_path.includes(";")) kandidaten.push(source.file_path.split(";")[0]);
  let blob: Blob | null = null;
  for (const pfad of kandidaten) {
    const { data } = await admin.storage.from("internal-files").download(pfad);
    if (data) { blob = data; break; }
  }
  if (!blob) {
    await admin.from("sources").update({ file_missing: true }).eq("id", sourceId);
    return { ok: true, ergebnis: "fehlt" };
  }

  const name = source.file_path.split("/").pop()!.replace(/^\d+_/, "");
  await ensureFolder(target);
  const uploadUrl = await createUploadSession(target, source.epoch ?? "", name);
  const item = await uploadBytes(uploadUrl, new Uint8Array(await blob.arrayBuffer()));

  const { error: updateError } = await admin.from("sources")
    .update({ ...fileColumns(item), file_path: null, file_missing: false })
    .eq("id", sourceId);
  if (updateError) throw new Error(`Hochgeladen, aber die Quelle ist nicht umgestellt: ${updateError.message}`);

  // Beide Namen: Das Löschen geht über den Rumpf der Anfrage und trifft den
  // vollen Namen genau – den gibt es aber nicht, wenn er abgeschnitten war.
  await admin.storage.from("internal-files").remove(kandidaten);
  return { ok: true, ergebnis: "verschoben", groesse: item.size ?? null };
}
