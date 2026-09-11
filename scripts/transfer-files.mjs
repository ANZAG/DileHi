// Die Dateien aus den Ablagen des alten Projekts ins neue tragen.
//
// Aufgerufen vom Workflow „Umzug", nachdem die Datenbank eingespielt ist.
// `backup-export` liefert für jede Datei eine Adresse, die eine Stunde gilt;
// von dort wird geladen und mit dem service_role-Schlüssel des neuen Projekts
// unter demselben Pfad abgelegt. Derselbe Pfad ist wichtig: Die Datenbank
// verweist darauf (documents.storage_path, Bilder in den Seiten), und die
// Zugriffsregeln der Ablagen lesen ihn aus (personas/<Konto>/…).
//
//   node scripts/transfer-files.mjs <abzug.json>
//
// Umgebung: TARGET_URL (https://<ref>.supabase.co), SERVICE_KEY.
//
// Dateinamen werden nicht ausgegeben. In einer Ablage für Mitgliedsunterlagen
// kann ein Name schon ein Name sein, und das Protokoll eines Workflows liest
// jeder mit Zugang zum Repository.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PARALLEL = 4;

/**
 * Die Grenzen einer Ablage (Grösse, erlaubte Dateitypen) gelten beim
 * Hochladen. In der alten Datenbank wurden sie gesetzt, als schon Dateien
 * darin lagen – 25 MB je Datei, keine .docm, keine Schriften. Beim ersten
 * Umzug lehnte das neue Projekt deshalb 29 von 140 Dateien ab, die in der
 * alten Ablage längst lagen.
 *
 * Für die Übertragung werden die Grenzen darum aufgehoben und danach wieder
 * gesetzt, auch wenn unterwegs etwas scheitert. Die Grenze des ganzen
 * Projekts (Project Settings → Storage) bleibt; was darüber liegt, steht im
 * Bericht.
 */
export async function transferFiles(files, { target, key, log = console.log }) {
  const base = target.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${key}`, apikey: key };
  const perBucket = new Map();
  const failures = [];
  const restoreFailures = [];

  const bucketUrl = (id) => `${base}/storage/v1/bucket/${encodeURIComponent(id)}`;
  const putBucket = (id, settings) =>
    fetch(bucketUrl(id), {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

  // ── Grenzen merken und aufheben ─────────────────────────────────────────
  const saved = new Map();
  for (const id of new Set(files.map((f) => f.bucket))) {
    const got = await fetch(bucketUrl(id), { headers });
    if (!got.ok) {
      log(`::warning::${id}: Ablage im Ziel nicht lesbar (HTTP ${got.status}), Grenzen bleiben.`);
      continue;
    }
    const b = await got.json();
    const settings = {
      public: b.public,
      file_size_limit: b.file_size_limit ?? null,
      allowed_mime_types: b.allowed_mime_types ?? null,
    };
    if (settings.file_size_limit === null && settings.allowed_mime_types === null) continue;
    const put = await putBucket(id, { public: b.public, file_size_limit: null, allowed_mime_types: null });
    if (put.ok) saved.set(id, settings);
    else log(`::warning::${id}: Grenzen liessen sich nicht aufheben (HTTP ${put.status}).`);
  }

  let done = 0;
  async function carry(file) {
    const tally = perBucket.get(file.bucket) ?? { ok: 0, failed: 0 };
    perBucket.set(file.bucket, tally);
    const ext = (file.name.match(/\.[A-Za-z0-9]{1,6}$/)?.[0] ?? "").toLowerCase();
    const size = typeof file.size === "number" ? `, ${(file.size / 1048576).toFixed(1)} MB` : "";

    try {
      if (!file.url) throw new Error("keine Adresse im Abzug");
      const source = await fetch(file.url);
      if (!source.ok) throw new Error(`Laden: HTTP ${source.status}`);
      const body = Buffer.from(await source.arrayBuffer());

      const path = file.name.split("/").map(encodeURIComponent).join("/");
      const put = await fetch(`${base}/storage/v1/object/${encodeURIComponent(file.bucket)}/${path}`, {
        method: "POST",
        headers: {
          ...headers,
          "x-upsert": "true",
          "Content-Type": file.mimetype || "application/octet-stream",
        },
        body,
      });
      if (!put.ok) {
        const reason = (await put.text()).slice(0, 200).replace(/\s+/g, " ");
        throw new Error(`Ablegen: HTTP ${put.status} ${reason}`);
      }
      tally.ok++;
    } catch (err) {
      tally.failed++;
      failures.push(`${file.bucket} (${ext || "ohne Endung"}${size}): ${err instanceof Error ? err.message : err}`);
    } finally {
      done++;
      if (done % 25 === 0) log(`${done} von ${files.length}`);
    }
  }

  try {
    const queue = [...files];
    await Promise.all(
      Array.from({ length: PARALLEL }, async () => {
        for (let f = queue.shift(); f; f = queue.shift()) await carry(f);
      })
    );
  } finally {
    // ── Grenzen wieder setzen, und nachsehen, ob sie stehen ─────────────
    for (const [id, settings] of saved) {
      const put = await putBucket(id, settings).catch(() => null);
      const check = put?.ok ? await fetch(bucketUrl(id), { headers }).then((r) => r.json()).catch(() => null) : null;
      const same =
        check &&
        (check.file_size_limit ?? null) === settings.file_size_limit &&
        JSON.stringify(check.allowed_mime_types ?? null) === JSON.stringify(settings.allowed_mime_types);
      if (!same) restoreFailures.push(id);
    }
  }

  log("");
  for (const [bucket, t] of perBucket) {
    log(`${bucket}: ${t.ok} übertragen${t.failed ? `, ${t.failed} gescheitert` : ""}`);
  }
  for (const f of failures) log(`::warning::${f}`);
  for (const id of restoreFailures) {
    log(`::error::${id}: Die Grenzen der Ablage stehen nicht wieder wie vorher. Bitte in Supabase unter Storage nachsehen.`);
  }
  log(`\n${files.length - failures.length} von ${files.length} Dateien übertragen.`);

  return { failures, restoreFailures };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [, , exportPath] = process.argv;
  const target = process.env.TARGET_URL ?? "";
  const key = process.env.SERVICE_KEY ?? "";
  if (!exportPath || !target || !key) {
    console.error("Aufruf: TARGET_URL=… SERVICE_KEY=… node scripts/transfer-files.mjs <abzug.json>");
    process.exit(2);
  }
  const files = JSON.parse(readFileSync(exportPath, "utf-8")).dateien ?? [];
  const { failures, restoreFailures } = await transferFiles(files, { target, key });
  process.exit(failures.length > 0 || restoreFailures.length > 0 ? 1 : 0);
}
