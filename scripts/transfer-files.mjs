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

const [, , exportPath] = process.argv;
const target = (process.env.TARGET_URL ?? "").replace(/\/$/, "");
const key = process.env.SERVICE_KEY ?? "";

if (!exportPath || !target || !key) {
  console.error("Aufruf: TARGET_URL=… SERVICE_KEY=… node scripts/transfer-files.mjs <abzug.json>");
  process.exit(2);
}

const files = JSON.parse(readFileSync(exportPath, "utf-8")).dateien ?? [];
const PARALLEL = 4;

const perBucket = new Map();
const failures = [];
let done = 0;

async function carry(file) {
  const tally = perBucket.get(file.bucket) ?? { ok: 0, failed: 0 };
  perBucket.set(file.bucket, tally);
  const ext = (file.name.match(/\.[A-Za-z0-9]{1,6}$/)?.[0] ?? "").toLowerCase();

  try {
    if (!file.url) throw new Error("keine Adresse im Abzug");
    const source = await fetch(file.url);
    if (!source.ok) throw new Error(`Laden: HTTP ${source.status}`);
    const body = Buffer.from(await source.arrayBuffer());

    const path = file.name.split("/").map(encodeURIComponent).join("/");
    const put = await fetch(`${target}/storage/v1/object/${encodeURIComponent(file.bucket)}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
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
    failures.push(`${file.bucket} (${ext || "ohne Endung"}): ${err instanceof Error ? err.message : err}`);
  } finally {
    done++;
    if (done % 25 === 0) console.log(`${done} von ${files.length}`);
  }
}

const queue = [...files];
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) await carry(f);
  })
);

console.log("");
for (const [bucket, t] of perBucket) {
  console.log(`${bucket}: ${t.ok} übertragen${t.failed ? `, ${t.failed} gescheitert` : ""}`);
}
for (const f of failures) console.log(`::warning::${f}`);
console.log(`\n${files.length - failures.length} von ${files.length} Dateien übertragen.`);
process.exit(failures.length > 0 ? 1 : 0);
