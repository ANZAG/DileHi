/**
 * Die mitgelieferten Bilder in den eigenen Speicher umziehen.
 *
 * Achtzehn Fotos liegen in `src/assets` und werden in jede Installation
 * mitgeliefert — 4,6 MB, die einem einzelnen Verein gehoeren. Loeschen kann
 * man sie erst, wenn sie dort liegen, wo die Bilder jedes anderen Vereins
 * auch liegen: im Speicher des eigenen Projekts (Bucket `gallery`), mit dem
 * Pfad in `site_images.storage_path`.
 *
 * Genau das tut dieses Skript, einmalig:
 *
 *   1. Es liest, welches Bild zu welchem Platz gehoert — aus
 *      `SITE_IMAGE_FALLBACKS` in src/hooks/useSiteImage.ts, damit die
 *      Zuordnung nur an einer Stelle steht.
 *   2. Es laedt die Datei in den Bucket `gallery` unter `site/<platz>.webp`.
 *   3. Es traegt den Pfad bei dem Platz ein — aber nur dort, wo noch keiner
 *      steht. Ein selbst hochgeladenes Bild wird nie ueberschrieben.
 *
 * Aufruf (der Schluessel steht nur in eurer Umgebung, nie im Repository):
 *
 *   SUPABASE_URL=https://<projekt>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<schluessel> \
 *   node scripts/bilder-umziehen.mjs            # zeigt nur, was passieren wuerde
 *
 *   ... node scripts/bilder-umziehen.mjs --wirklich   # macht es
 *
 * Ohne `--wirklich` wird nichts geschrieben. Ein Skript, das beim ersten
 * Aufruf Daten anfasst, ist eines, das man nicht ausprobieren kann.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const URL_BASIS = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SCHLUESSEL = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const WIRKLICH = process.argv.includes("--wirklich");
const BUCKET = "gallery";

if (!URL_BASIS || !SCHLUESSEL) {
  console.error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.");
  process.exit(1);
}

/** Welcher Platz welches Bild bekommt – aus dem Programm gelesen, nicht abgeschrieben. */
function zuordnung() {
  const quelle = readFileSync("src/hooks/useSiteImage.ts", "utf-8");
  const dateien = Object.fromEntries(
    [...quelle.matchAll(/import (\w+) from "@\/assets\/([^"]+)"/g)].map((m) => [m[1], m[2]])
  );
  const block = quelle.match(/export const SITE_IMAGE_FALLBACKS[^{]*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("SITE_IMAGE_FALLBACKS nicht gefunden");
  return [...block[1].matchAll(/"([^"]+)":\s*(\w+)/g)]
    .map((m) => ({ platz: m[1], datei: dateien[m[2]] }))
    .filter((e) => e.datei);
}

const kopf = {
  apikey: SCHLUESSEL,
  Authorization: `Bearer ${SCHLUESSEL}`,
};

async function plaetze() {
  const antwort = await fetch(
    `${URL_BASIS}/rest/v1/site_images?select=slot,label,storage_path`,
    { headers: kopf }
  );
  if (!antwort.ok) throw new Error(`site_images lesen: ${antwort.status} ${await antwort.text()}`);
  return await antwort.json();
}

async function hochladen(ziel, daten) {
  const antwort = await fetch(`${URL_BASIS}/storage/v1/object/${BUCKET}/${ziel}`, {
    method: "POST",
    headers: { ...kopf, "Content-Type": "image/webp", "x-upsert": "true" },
    body: daten,
  });
  if (!antwort.ok) throw new Error(`hochladen ${ziel}: ${antwort.status} ${await antwort.text()}`);
}

async function eintragen(platz, ziel) {
  const antwort = await fetch(
    `${URL_BASIS}/rest/v1/site_images?slot=eq.${encodeURIComponent(platz)}&storage_path=is.null`,
    {
      method: "PATCH",
      headers: { ...kopf, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ storage_path: ziel }),
    }
  );
  if (!antwort.ok) throw new Error(`eintragen ${platz}: ${antwort.status} ${await antwort.text()}`);
  return (await antwort.json()).length;
}

const vorhandene = await plaetze();
const nachSlot = Object.fromEntries(vorhandene.map((p) => [p.slot, p]));

console.log(WIRKLICH ? "Es wird umgezogen.\n" : "Probelauf – es wird nichts geschrieben.\n");

let umgezogen = 0;
let uebersprungen = 0;
let ohnePlatz = 0;

for (const { platz, datei } of zuordnung()) {
  const eintrag = nachSlot[platz];
  if (!eintrag) {
    console.log(`  –  ${platz}: kein Bildplatz in der Datenbank, nichts zu tun`);
    ohnePlatz += 1;
    continue;
  }
  if (eintrag.storage_path) {
    console.log(`  –  ${platz}: hat schon ein eigenes Bild (${eintrag.storage_path})`);
    uebersprungen += 1;
    continue;
  }

  const ziel = `site/${platz}${path.extname(datei)}`;
  if (!WIRKLICH) {
    console.log(`  →  ${platz}: ${datei} würde nach ${BUCKET}/${ziel}`);
    umgezogen += 1;
    continue;
  }

  await hochladen(ziel, readFileSync(path.join("src/assets", datei)));
  const zeilen = await eintragen(platz, ziel);
  console.log(`  ✓  ${platz}: ${datei} → ${BUCKET}/${ziel} (${zeilen} Zeile geändert)`);
  umgezogen += 1;
}

console.log(
  `\n${umgezogen} umgezogen, ${uebersprungen} hatten schon ein eigenes Bild, ` +
  `${ohnePlatz} ohne Bildplatz.`
);
if (!WIRKLICH) console.log("Noch einmal mit --wirklich, wenn das so stimmt.");
else console.log("Danach im Erscheinungsbild nachsehen, ob die Seite aussieht wie vorher.");
