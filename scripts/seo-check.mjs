#!/usr/bin/env node
/**
 * Prüfungen rund um Auffindbarkeit und Standalone-Tauglichkeit.
 *
 * Läuft in `npm run ci`, also bei jedem Durchlauf.
 *
 * Zwei Dinge haben sich gegenüber der ersten Fassung geändert, und beide sind
 * wichtig genug, um sie hier festzuhalten:
 *
 *   Die Sitemap ist keine Datei mehr. Sie entsteht aus `site_pages`, weil die
 *   Seiten seit dem Umbau in der Datenbank stehen. Eine feste Liste wäre nach
 *   der ersten neuen Seite falsch gewesen.
 *
 *   Die Prüfung „steht dilehi.de drin?" war genau verkehrt herum. Für ein
 *   Produkt, das ein anderer Verein aufsetzt, ist eine fest eingetragene
 *   Domain kein Qualitätsmerkmal, sondern ein Fehler. Geprüft wird jetzt das
 *   Gegenteil: Ausser an den zwei Stellen, die eine Installation ohnehin
 *   anfassen muss, darf sie nirgends stehen.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fehler = [];
const hinweise = [];

const lies = (p) => fs.readFileSync(path.join(root, p), "utf8");
const gibt = (p) => fs.existsSync(path.join(root, p));

// ── 1. Die Grundangaben in index.html ───────────────────────────────────────
try {
  const html = lies("index.html");
  if (!/<html[^>]*\slang=/.test(html)) fehler.push("index.html: <html lang> fehlt");
  if (!/name=["']viewport["']/.test(html)) fehler.push("index.html: viewport-Angabe fehlt");
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fehler.push("index.html: <title> fehlt oder ist zu kurz");
  // Kein og:image in index.html verlangen: Ein Bild, das jeder Installation
  // mitgegeben wird, ist das Bild eines fremden Vereins. Wer eines hinterlegt
  // (Erscheinungsbild → Bild für geteilte Links), bekommt es zur Laufzeit aus
  // den Vereinsdaten (src/components/SEO.tsx).
  if (!/<title>[^<]*<\/title>/.test(html)) hinweise.push("index.html: <title> fehlt");
} catch (e) {
  fehler.push(`index.html nicht lesbar: ${e.message}`);
}

// ── 2. Öffentliche Seiten brauchen <SEO> ────────────────────────────────────
const seitenOrdner = path.join(root, "src/pages");
const durchlaufen = (ordner) =>
  fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(ordner, e.name);
    return e.isDirectory() ? durchlaufen(p) : [p];
  });

// Der Mitgliederbereich, die Fehlerseite und die Anmeldung stehen bewusst nicht
// in Suchmaschinen.
const uebersprungen = /(NotFound|Login|ResetPassword)\.tsx$/;
const oeffentlich = durchlaufen(seitenOrdner)
  .filter((p) => p.endsWith(".tsx"))
  .filter((p) => !p.includes(`${path.sep}intern${path.sep}`) && !uebersprungen.test(p));

for (const datei of oeffentlich) {
  const inhalt = fs.readFileSync(datei, "utf8");
  const rel = path.relative(root, datei);
  if (!/<SEO\b/.test(inhalt)) {
    fehler.push(`${rel}: kein <SEO />`);
    continue;
  }
  if (!/title=/.test(inhalt)) fehler.push(`${rel}: <SEO> ohne title`);
  if (!/description=/.test(inhalt)) fehler.push(`${rel}: <SEO> ohne description`);
}

// ── 3. Die Baukastenseiten bringen ihre strukturierten Daten selbst mit ─────
//
// Früher stand hier eine Prüfung auf „Epoch*.tsx". Diese Dateien gibt es nicht
// mehr – die Themenseiten liegen im Editor. Die Prüfung war damit seit dem
// Umzug wirkungslos und grün.
if (!/application\/ld\+json/.test(lies("src/components/SEO.tsx"))) {
  fehler.push("src/components/SEO.tsx: keine strukturierten Daten (JSON-LD)");
}

// ── 4. robots.txt, Sitemap, llms.txt ────────────────────────────────────────
if (!gibt("public/robots.txt")) {
  fehler.push("public/robots.txt fehlt");
} else {
  const r = lies("public/robots.txt");
  // Die Adresse setzt der Build ein (vite.config.ts), hier steht der Platzhalter.
  if (!/^Sitemap:\s*(https?:\/\/|__FUNCTIONS_URL__\/)/m.test(r)) fehler.push("public/robots.txt: Sitemap-Zeile fehlt");
  if (!/Disallow:\s*\/intern\//.test(r)) fehler.push("public/robots.txt: /intern/ ist nicht ausgeschlossen");
}

if (!gibt("supabase/functions/sitemap/index.ts")) {
  fehler.push("Die Sitemap-Funktion fehlt (supabase/functions/sitemap)");
} else if (!/\[functions\.sitemap\][\s\S]*?verify_jwt = false/.test(lies("supabase/config.toml"))) {
  fehler.push("supabase/config.toml: sitemap braucht verify_jwt = false, Suchmaschinen haben keine Sitzung");
}

if (!gibt("public/llms.txt")) hinweise.push("public/llms.txt fehlt");

// ── 5. Keine fest eingetragene Vereinsdomain ────────────────────────────────
//
// Diese zwei Stellen muss eine neue Installation anfassen, alles andere kommt
// aus den Vereinsangaben. Steht die Domain woanders, ist das ein Fehler, der
// erst beim fremden Verein auffällt – und dort niemandem, der ihn beheben kann.
const erlaubt = new Set(["index.html", path.join("public", "robots.txt")]);
const durchsuchen = [
  ...durchlaufen(path.join(root, "src")).filter((p) => /\.(ts|tsx)$/.test(p) && !p.includes(`${path.sep}test${path.sep}`)),
  ...durchlaufen(path.join(root, "supabase/functions")).filter((p) => p.endsWith(".ts")),
];

for (const datei of durchsuchen) {
  const rel = path.relative(root, datei);
  if (erlaubt.has(rel)) continue;
  const inhalt = fs.readFileSync(datei, "utf8");
  // Kommentare zählen nicht: Dort steht oft, was früher hier stand.
  const ohneKommentare = inhalt
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  if (/dilehi\.de/i.test(ohneKommentare)) {
    fehler.push(`${rel}: feste Vereinsdomain im Code – gehört in die Vereinsangaben`);
  }
}

// ── Bericht ─────────────────────────────────────────────────────────────────
if (hinweise.length) {
  console.warn("\nHinweise:");
  for (const h of hinweise) console.warn("  -", h);
}
if (fehler.length) {
  console.error("\nPrüfung fehlgeschlagen:");
  for (const f of fehler) console.error("  -", f);
  console.error(`\n${fehler.length} Fehler, ${hinweise.length} Hinweis(e).`);
  process.exit(1);
}
console.log(`Prüfung bestanden (${hinweise.length} Hinweis(e)).`);
