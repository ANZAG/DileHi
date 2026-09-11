import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Vollständiger Abzug der Datenbank – ohne Datenbank-Passwort.
 *
 * In der Lovable-Cloud gibt es weder eine Verbindungszeichenfolge noch das
 * Passwort, `pg_dump` von außen fällt damit aus. Der Service-Role-Schlüssel
 * muss deshalb aber niemandem ausgehändigt werden: Er steht hier ohnehin in
 * der Umgebung. Der Abzug entsteht also innen; von außen wird er nur abgeholt
 * und verschlüsselt abgelegt.
 *
 * Abgesichert über ein gemeinsames Geheimnis (BACKUP_TOKEN) – wie die
 * Tageszusammenfassung, denn ein Zeitplandienst hat keine Sitzung. Bewusst ein
 * EIGENES Geheimnis und nicht dasselbe wie für die Zusammenfassung: Diese
 * Funktion gibt den gesamten Datenbestand heraus, die andere verschickt nur
 * Mails. Ein durchgesickertes Geheimnis soll nicht beides öffnen.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-backup-token",
  // Woran der Umzug erkennt, ob diese Fassung schon ausgerollt ist. In der
  // Lovable-Cloud sieht man das sonst nirgends.
  "X-Backup-Export": "2",
};

/** PostgREST liefert höchstens 1000 Zeilen je Anfrage. */
const PAGE = 1000;

/** Schutz gegen ein Versehen, das die Funktion sonst ewig laufen liesse. */
const MAX_ROWS_PER_TABLE = 200_000;
const MAX_STORAGE_DEPTH = 6;

interface StorageEntry {
  bucket: string;
  name: string;
  size: number | null;
  mimetype: string | null;
  updated_at: string | null;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("BACKUP_TOKEN");
  const provided = req.headers.get("x-backup-token");
  if (!expected || provided !== expected) {
    return json({ error: "Nicht berechtigt" }, 401);
  }

  let withFiles = false;
  let withAccounts = false;
  try {
    const body = await req.json();
    withFiles = body?.files === true;
    withAccounts = body?.accounts === true;
  } catch {
    // Kein Rumpf ist in Ordnung – dann eben nur die Daten.
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const warnungen: string[] = [];

  // ── Aufbau ────────────────────────────────────────────────────────────────
  const { data: ddl, error: ddlError } = await admin.rpc("backup_schema_ddl");
  if (ddlError) warnungen.push(`Schema: ${ddlError.message}`);

  // ── Tabellen ──────────────────────────────────────────────────────────────
  const { data: manifest, error: manifestError } = await admin.rpc("backup_manifest");
  if (manifestError) {
    return json({ error: `Tabellenliste nicht lesbar: ${manifestError.message}` }, 500);
  }

  const tabellen: Record<string, unknown[]> = {};
  const zeilen: Record<string, number> = {};

  for (const entry of (manifest ?? []) as { table_name: string }[]) {
    const name = entry.table_name;
    const rows: unknown[] = [];
    let from = 0;

    for (;;) {
      const { data, error } = await admin
        .from(name)
        .select("*")
        .range(from, from + PAGE - 1);

      if (error) {
        // Eine unlesbare Tabelle darf die übrigen nicht mitreissen – aber sie
        // muss auffallen, sonst hält man eine Teilsicherung für vollständig.
        warnungen.push(`Tabelle ${name}: ${error.message}`);
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
      if (rows.length >= MAX_ROWS_PER_TABLE) {
        warnungen.push(`Tabelle ${name}: bei ${MAX_ROWS_PER_TABLE} Zeilen abgeschnitten.`);
        break;
      }
    }

    tabellen[name] = rows;
    zeilen[name] = rows.length;
  }

  // ── Dateien ───────────────────────────────────────────────────────────────
  //
  // Nur die Liste plus zeitlich begrenzte Adressen. Die Dateien selbst durch
  // diese Antwort zu schleusen würde den Speicher der Funktion sprengen; sie
  // werden vom Sicherungslauf einzeln nachgeladen.
  let dateien: StorageEntry[] = [];
  if (withFiles) {
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      warnungen.push(`Speicher: ${bucketError.message}`);
    } else {
      for (const bucket of buckets ?? []) {
        try {
          const found = await walkBucket(admin, bucket.id, "", 0);
          const paths = found.map((f) => f.name);
          for (let i = 0; i < paths.length; i += 100) {
            const chunk = paths.slice(i, i + 100);
            const { data: signed } = await admin.storage
              .from(bucket.id)
              .createSignedUrls(chunk, 3600);
            for (const s of signed ?? []) {
              const hit = found.find((f) => f.name === (s as { path?: string }).path);
              if (hit && s.signedUrl) hit.url = s.signedUrl;
            }
          }
          dateien = dateien.concat(found);
        } catch (err) {
          warnungen.push(`Speicher ${bucket.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  // ── Konten ────────────────────────────────────────────────────────────────
  //
  // Nur für den Umzug, nie in der täglichen Sicherung: Darin stünden sonst die
  // Passwort-Hashes aller Mitglieder 90 Tage lang in einem GitHub-Artefakt.
  const konten = withAccounts ? await readAccounts(admin, warnungen) : null;

  return json({
    erzeugt_am: new Date().toISOString(),
    hinweis:
      "Datenabzug ueber die API. Der Aufbau steht zusaetzlich als Migrationen im " +
      "Repository; schema_ddl ist der tatsaechliche Ist-Zustand der Datenbank.",
    schema_ddl: ddl ?? null,
    zeilen,
    tabellen,
    dateien,
    ...(konten ? { konten } : {}),
    warnungen,
  }, warnungen.length > 0 ? 207 : 200);
});

interface Accounts {
  /** Zeilen in der Form von auth.users. */
  users: Record<string, unknown>[];
  /** Zeilen in der Form von auth.identities. */
  identities: Record<string, unknown>[];
  /** true, wenn die Passwort-Hashes dabei sind. */
  passwoerter: boolean;
}

/**
 * Die Konten aus `auth`, am liebsten samt Passwort.
 *
 * Mit Passwort geht es nur über `transfer_accounts()`, die in der Datenbank
 * angelegt sein muss (supabase/transfer/export-accounts.sql). Fehlt sie, gibt
 * es die Konten ohne Passwort über die Verwaltungsschnittstelle. Dann müssen
 * alle einmal „Passwort vergessen" wählen, aber alles, was an einem Konto
 * hängt, bleibt beim richtigen Menschen.
 */
async function readAccounts(
  admin: ReturnType<typeof createClient>,
  warnungen: string[]
): Promise<Accounts> {
  const { data, error } = await admin.rpc("transfer_accounts");
  if (!error && data) {
    const d = data as { users?: Record<string, unknown>[]; identities?: Record<string, unknown>[] };
    return { users: d.users ?? [], identities: d.identities ?? [], passwoerter: true };
  }

  warnungen.push(
    `Konten ohne Passwort: transfer_accounts() ist nicht aufrufbar (${error?.message ?? "keine Antwort"}).`
  );

  const users: Record<string, unknown>[] = [];
  const identities: Record<string, unknown>[] = [];
  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (listError) {
      warnungen.push(`Konten: ${listError.message}`);
      break;
    }
    for (const u of list.users) {
      users.push({
        id: u.id,
        aud: u.aud,
        role: u.role ?? "authenticated",
        email: u.email ?? null,
        phone: u.phone || null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        invited_at: u.invited_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
        updated_at: u.updated_at ?? u.created_at,
        raw_app_meta_data: u.app_metadata ?? {},
        raw_user_meta_data: u.user_metadata ?? {},
        banned_until: (u as { banned_until?: string }).banned_until ?? null,
      });
      for (const i of u.identities ?? []) {
        identities.push({
          id: i.identity_id ?? i.id,
          provider_id: i.id,
          user_id: i.user_id,
          identity_data: i.identity_data ?? {},
          provider: i.provider,
          last_sign_in_at: i.last_sign_in_at ?? null,
          created_at: i.created_at ?? null,
          updated_at: i.updated_at ?? null,
        });
      }
    }
    if (list.users.length < PAGE) break;
  }
  return { users, identities, passwoerter: false };
}

/** Speicher-Ordner sind nicht rekursiv abfragbar – also selbst hinabsteigen. */
async function walkBucket(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
  depth: number
): Promise<StorageEntry[]> {
  if (depth > MAX_STORAGE_DEPTH) return [];

  const out: StorageEntry[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // Ordner haben keine id – daran sind sie zu erkennen.
      if (item.id === null || item.id === undefined) {
        out.push(...(await walkBucket(admin, bucket, full, depth + 1)));
      } else {
        out.push({
          bucket,
          name: full,
          size: (item.metadata?.size as number | undefined) ?? null,
          mimetype: (item.metadata?.mimetype as string | undefined) ?? null,
          updated_at: item.updated_at ?? null,
        });
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return out;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
