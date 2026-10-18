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
// Und seit Oktober 2026 schreibt er für jede veröffentlichte Seite fertiges
// HTML mit ihrem Text (scripts/vorabSeiten.mjs erklärt, warum), dazu die
// Serverregeln: welche Adresse es gibt, welche nicht (404), und welche
// Schreibweise der Domain die richtige ist.
//
// Fehlt die Adresse der Datenbank oder antwortet sie nicht, bleibt die
// index.html unverändert: Die Seite funktioniert dann wie vorher, sie
// beginnt nur mit den Vorgaben. Der Bau scheitert daran nicht. Dasselbe gilt
// für die Seiten: Ohne Seitenliste kein 404 – sonst sagte der Server zu jeder
// Seite „gibt es nicht".

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  apacheHauptadresse, apacheSeiten, bildAdressen, dateiVon, fehlerDokument, hauptadressePruefen,
  kontaktDokument, mitVorab, mitVorverbindung, redirectsSeiten, seitenDokument, seitenStand,
  shellDokument, sichererSlug,
} from "./vorabSeiten.mjs";

const DIST = "dist";
const DATEI = `${DIST}/index.html`;
const url = process.env.VITE_SUPABASE_URL;
const schluessel = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Die Platzhalter in public/.htaccess und public/_redirects. */
const MARKE_HAUPTADRESSE = "# __VORAB_HAUPTADRESSE__";
const MARKE_SEITEN = "# __VORAB_SEITEN__";

const bericht = [];

function melden(text) {
  console.log(`vorabzug: ${text}`);
  bericht.push(text);
}

/** Warnungen auch in die Zusammenfassung des Laufs auf GitHub. */
function warnen(text) {
  console.log(`vorabzug: ACHTUNG ${text}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${text.replace(/\n/g, " ")}`);
  bericht.push(`**Achtung:** ${text}`);
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

function schreiben(datei, inhalt) {
  const ziel = path.join(DIST, datei);
  mkdirSync(path.dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
}

/** Ersetzt einen Platzhalter in einer gebauten Datei, wenn es sie gibt. */
function einsetzen(datei, marke, text) {
  const ziel = path.join(DIST, datei);
  if (!existsSync(ziel)) return;
  const alt = readFileSync(ziel, "utf8");
  if (!alt.includes(marke)) {
    warnen(`${datei}: Platzhalter ${marke} fehlt – Regeln nicht eingesetzt.`);
    return;
  }
  // Samt Einrückung davor: Die eingesetzten Zeilen bringen ihre eigene mit.
  const zeile = new RegExp(`^[ \\t]*${marke.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
  writeFileSync(ziel, alt.replace(zeile, () => text));
}

async function main() {
  if (!url || !schluessel) {
    melden("keine Datenbankadresse im Bau – index.html bleibt, wie sie ist.");
    return;
  }
  let branding = null;
  let menue = null;
  let seiten = null;
  let bilder = null;
  try {
    const zeilen = await holen("rpc/public_branding", { method: "POST", body: "{}" });
    branding = Array.isArray(zeilen) ? zeilen[0] ?? null : null;
  } catch (e) {
    melden(`Vereinsangaben nicht erreichbar (${e.message}).`);
  }
  try {
    const zeilen = await holen("site_menu?select=*&is_visible=eq.true&order=sort_order");
    const ids = [...new Set(zeilen.map((z) => z.page_id).filter(Boolean))];
    const zuordnung = {};
    if (ids.length > 0) {
      for (const p of await holen(`site_pages?select=id,slug&id=in.(${ids.join(",")})`)) zuordnung[p.id] = `/${p.slug}`;
    }
    menue = { zeilen, seiten: zuordnung };
  } catch (e) {
    melden(`Menü nicht erreichbar (${e.message}).`);
  }
  try {
    seiten = await holen(
      "site_pages?select=slug,title,content,seo_title,seo_description,seo_type,noindex&is_published=eq.true&order=slug"
    );
    if (!Array.isArray(seiten)) seiten = null;
  } catch (e) {
    melden(`Seiten nicht erreichbar (${e.message}) – kein Vorab-HTML, kein 404.`);
  }
  try {
    bilder = bildAdressen(await holen("site_images?select=*"), url);
  } catch (e) {
    melden(`Bildliste nicht erreichbar (${e.message}) – die Anwendung fragt sie wie bisher selbst ab.`);
  }
  if (!branding && !menue) {
    melden("nichts abgeholt – index.html bleibt, wie sie ist.");
    return;
  }

  // Die gebaute index.html ohne alles, was hier dazukommt. Jede Datei bekommt
  // ihren eigenen Vorabstand: die Seiten zusätzlich sich selbst.
  const roh = mitVorverbindung(readFileSync(DATEI, "utf8"), url);
  const gemeinsam = { branding, menue, ...(bilder ? { bilder } : {}) };
  const vorlage = mitVorab(roh, gemeinsam);

  // Die index.html bleibt die Hülle für die Adressen der Anwendung
  // (Anmeldung, Mitgliederbereich): Name und Vereinsbeschreibung, kein Text.
  writeFileSync(DATEI, shellDokument(vorlage, { marke: branding }));
  melden(`eingesetzt: ${branding?.org_name ? `„${branding.org_name}"` : "ohne Namen"}, ${menue ? `${menue.zeilen.length} Menüeinträge` : "ohne Menü"}.`);
  if (!branding?.seo_description?.trim()) {
    warnen("Keine SEO-Beschreibung des Vereins hinterlegt (Verwaltung → Erscheinungsbild). Bis dahin steht ein Satz aus Name, Ort und Untertitel da.");
  }

  // Ohne Vereinsangaben und Seitenliste ist alles Weitere geraten.
  if (!branding || !seiten) return;

  // ── Fertiges HTML je Seite ──
  const vorlageSeite = shellDokument(vorlage, { marke: branding });
  const fertig = [];
  for (const seite of seiten) {
    if (!sichererSlug(seite.slug)) {
      warnen(`Seite „${seite.slug}": Adresse mit Sonderzeichen – ohne Vorab-HTML. Ohne Umlaute und Leerzeichen benennen.`);
      continue;
    }
    if (seite.slug === "kontakt") continue; // die feste Kontaktseite hat Vorrang (src/App.tsx)
    const eigene = shellDokument(mitVorab(roh, { ...gemeinsam, seite: seitenStand(seite) }), { marke: branding });
    schreiben(dateiVon(seite.slug), seitenDokument(eigene, { seite, marke: branding, menue, bilder }));
    fertig.push(seite.slug);
  }
  schreiben(dateiVon("kontakt"), kontaktDokument(vorlageSeite, { marke: branding, menue }));
  fertig.push("kontakt");
  schreiben("404.html", fehlerDokument(vorlageSeite, { marke: branding }));
  melden(`Vorab-HTML für ${fertig.length} Seiten: ${fertig.join(", ")}.`);

  // Seiten mit Sonderzeichen im Namen bekämen von den Regeln ein 404. Dann
  // lieber gar keins – wie bisher.
  const mit404 = seiten.every((s) => sichererSlug(s.slug));
  if (!mit404) warnen("Unbekannte Adressen bekommen weiter 200 statt 404, solange eine Seite Sonderzeichen in der Adresse hat.");
  einsetzen(".htaccess", MARKE_SEITEN, apacheSeiten(fertig, { mit404 }));
  einsetzen("_redirects", MARKE_SEITEN, redirectsSeiten(fertig));

  // ── Eine Adresse für die Seite ──
  if (!branding.website_url?.trim()) {
    warnen("Keine Website-Adresse hinterlegt (Verwaltung → Erscheinungsbild). Ohne sie gibt es keine Canonical-Angaben und keine Umleitung von www bzw. ohne www.");
  } else {
    const pruefung = await hauptadressePruefen(branding.website_url);
    if (pruefung.ok) {
      einsetzen(".htaccess", MARKE_HAUPTADRESSE, apacheHauptadresse(pruefung.paar));
      melden(`Hauptadresse ${pruefung.paar.ursprung}: ${pruefung.paar.anderer} leitet dorthin um.`);
    } else {
      warnen(`Hauptadresse nicht gesetzt: ${pruefung.grund}. Canonical-Angaben und Sitemap zeigen trotzdem auf ${branding.website_url} – das muss die Adresse sein, unter der die Seite wirklich antwortet.`);
    }
  }
}

main()
  .catch((e) => {
    // Nie am Vorabzug scheitern: Ohne ihn läuft die Seite wie bisher.
    melden(`übersprungen (${e.message}).`);
  })
  .finally(() => {
    if (process.env.GITHUB_STEP_SUMMARY && bericht.length) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Vorab-HTML und Serverregeln\n\n${bericht.map((z) => `- ${z}`).join("\n")}\n`);
    }
  });
