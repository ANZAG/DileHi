// Schreibt die öffentlichen Vereinsangaben in die gebaute index.html.
//
// Bis die Anwendung ihre erste Abfrage beantwortet hat, zeigte sie die
// Vorgaben: „Verein", Orange, ein Menü aus nur der Startseite – auf einer
// langsamen Leitung sekundenlang. Hier holt der Bau einmal ab, was die Seite
// ohnehin öffentlich abfragt (public_branding und das Menü), und legt es als
// `window.__VORAB` vor das Programm. Siehe src/lib/vorabzug.ts.
//
// Nebenbei bekommen Titel und Beschreibung der index.html den Namen des
// Vereins statt „DING" – das sehen Suchmaschinen und geteilte Links, bevor
// die Anwendung läuft.
//
// Fehlt die Adresse der Datenbank oder antwortet sie nicht, bleibt die
// index.html unverändert: Die Seite funktioniert dann wie vorher, sie
// beginnt nur mit den Vorgaben. Der Bau scheitert daran nicht.

import { readFileSync, writeFileSync } from "node:fs";

const DATEI = "dist/index.html";
const url = process.env.VITE_SUPABASE_URL;
const schluessel = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function melden(text) {
  console.log(`vorabzug: ${text}`);
}

async function holen(pfad, init = {}) {
  const antwort = await fetch(`${url}/rest/v1/${pfad}`, {
    ...init,
    headers: { apikey: schluessel, Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!antwort.ok) throw new Error(`${pfad}: ${antwort.status}`);
  return antwort.json();
}

/** Für Text und Attribute im HTML. */
const html = (t) => String(t).replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);

/** JSON, das in einem <script> stehen darf, ohne es zu beenden. */
const skriptJson = (wert) => JSON.stringify(wert)
  .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

async function main() {
  if (!url || !schluessel) {
    melden("keine Datenbankadresse im Bau – index.html bleibt, wie sie ist.");
    return;
  }
  let branding = null;
  let menue = null;
  try {
    const zeilen = await holen("rpc/public_branding", { method: "POST", body: "{}" });
    branding = Array.isArray(zeilen) ? zeilen[0] ?? null : null;
  } catch (e) {
    melden(`Vereinsangaben nicht erreichbar (${e.message}).`);
  }
  try {
    const zeilen = await holen("site_menu?select=*&is_visible=eq.true&order=sort_order");
    const ids = [...new Set(zeilen.map((z) => z.page_id).filter(Boolean))];
    const seiten = {};
    if (ids.length > 0) {
      for (const p of await holen(`site_pages?select=id,slug&id=in.(${ids.join(",")})`)) seiten[p.id] = `/${p.slug}`;
    }
    menue = { zeilen, seiten };
  } catch (e) {
    melden(`Menü nicht erreichbar (${e.message}).`);
  }
  if (!branding && !menue) {
    melden("nichts abgeholt – index.html bleibt, wie sie ist.");
    return;
  }

  let seite = readFileSync(DATEI, "utf8");
  const vorab = `<script>window.__VORAB=${skriptJson({ branding, menue })}</script>`;
  // Vor das Programm, damit es beim Start schon dasteht.
  seite = seite.replace(/(<script type="module")/, `${vorab}\n    $1`);

  const name = branding?.org_name?.trim();
  const beschreibung = branding?.seo_description?.trim();
  if (name) {
    seite = seite
      .replace(/<title>[^<]*<\/title>/, `<title>${html(name)}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${html(name)}$2`)
      .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1${html(branding.org_short_name?.trim() || name)}$2`);
  }
  if (beschreibung) {
    seite = seite
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${html(beschreibung)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${html(beschreibung)}$2`);
  }
  writeFileSync(DATEI, seite);
  melden(`eingesetzt: ${name ? `„${name}"` : "ohne Namen"}, ${menue ? `${menue.zeilen.length} Menüeinträge` : "ohne Menü"}.`);
}

main().catch((e) => {
  // Nie am Vorabzug scheitern: Ohne ihn läuft die Seite wie bisher.
  melden(`übersprungen (${e.message}).`);
});
