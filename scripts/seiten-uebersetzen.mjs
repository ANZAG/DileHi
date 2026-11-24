// Die Texte der öffentlichen Seite zum Übersetzen herausgeben und die
// Übersetzungen wieder einlesen.
//
// Gedacht für den ersten Schwung: Alle veröffentlichten Seiten auf einmal in
// eine Datei, die sich ausserhalb der Seite übersetzen lässt (von Hand, mit
// DeepL, von einem Übersetzungsbüro), und danach in einem Zug zurück. Für
// einzelne Seiten im Alltag gibt es den Knopf in der Seitenverwaltung.
//
//   node scripts/seiten-uebersetzen.mjs export [texte.json]
//   node scripts/seiten-uebersetzen.mjs import texte.json [--probe] [--von-hand]
//
// Läuft nie von selbst, auch nicht beim Bauen. Braucht die Adresse der
// Datenbank (VITE_SUPABASE_URL); zum Lesen den öffentlichen Schlüssel
// (VITE_SUPABASE_PUBLISHABLE_KEY), zum Einlesen den Dienstschlüssel
// (SUPABASE_SERVICE_ROLE_KEY) – der gehört in keine Datei, nur in die
// Umgebung dieses einen Aufrufs.
//
// Die Datei: je Seite eine Liste von Texten mit dem deutschen Original („de")
// und leeren Feldern „en" und „fr". Ausgefüllt wird nur, was übersetzt werden
// soll; Tags in Texten der Art „html" bleiben stehen. Beim Einlesen wird
// jeder Text mit dem heutigen Deutsch verglichen – was sich seit dem Export
// geändert hat, bleibt deutsch und wird gemeldet, statt an die falsche Stelle
// zu geraten.
//
// Neben den Seiten stehen unter „rahmen" die kurzen Texte, die zu keiner
// Seite gehören: Menüpunkte, Untertitel und Fuss, Bildbeschreibungen,
// Besucherhinweise, Quellen. Quellen, die nach einer Literaturangabe aussehen,
// tragen den Vermerk „literaturangabe": Sie bleiben in der Regel, wie sie
// sind – wer sie trotzdem ausfüllt, bekommt sie eingelesen.
//
// Was an einer Seite Text ist, weiss supabase/functions/_shared/seitentexte.mjs
// – dasselbe Modul, das auch der Editor und die Übersetzungsfunktion nehmen.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { seiteZerlegen, seiteZusammensetzen } from "../supabase/functions/_shared/seitentexte.mjs";
import { rahmentexteSammeln } from "../supabase/functions/_shared/rahmentexte.mjs";

export const SPRACHEN = ["en", "fr"];

const leer = () => Object.fromEntries(SPRACHEN.map((s) => [s, ""]));

/** Die Datei zum Übersetzen – ohne Datei- und Netzzugriff, damit es sich prüfen lässt. */
export function exportBauen({ seiten, ...rahmen }) {
  return {
    hinweis: "„de“ ist das Original und bleibt, wie es ist. „en“ und „fr“ ausfüllen; leer heisst: nicht übersetzen. "
      + "In Texten der Art „html“ die Tags stehen lassen und nur den Text dazwischen übersetzen.",
    sprachen: SPRACHEN,
    seiten: (seiten ?? []).map((seite) => ({
      slug: seite.slug,
      texte: seiteZerlegen(seite).map((t) => ({ schluessel: t.schluessel, art: t.art, de: t.text, ...leer() })),
    })),
    rahmen: rahmentexteSammeln(rahmen).map((z) => ({
      schluessel: z.schluessel,
      ...(z.ort ? { ort: z.ort } : {}),
      ...(z.maschinell ? {} : { literaturangabe: true }),
      de: z.text,
      ...leer(),
    })),
  };
}

/**
 * Aus der ausgefüllten Datei und dem heutigen Stand der Datenbank die Zeilen
 * für site_page_translations und site_text_translations.
 *
 * Eine Seite bekommt in einer Sprache nur dann eine Zeile, wenn wenigstens
 * ein Text übersetzt ist. `meldungen` nennt, was nicht passte.
 */
export function importZeilen(datei, { seiten, ...rahmen }, { maschinell = true } = {}) {
  const meldungen = [];
  const seitenZeilen = [];
  const textZeilen = [];
  const nachSlug = new Map((seiten ?? []).map((s) => [s.slug, s]));

  for (const eintrag of Array.isArray(datei?.seiten) ? datei.seiten : []) {
    const seite = nachSlug.get(eintrag?.slug);
    if (!seite) {
      meldungen.push(`Seite „${eintrag?.slug}“: gibt es nicht (mehr) oder ist nicht veröffentlicht – übersprungen.`);
      continue;
    }
    const texte = Array.isArray(eintrag.texte) ? eintrag.texte : [];
    const original = Object.fromEntries(texte.map((t) => [t.schluessel, t.de]));
    // Auch Titel und Suchmaschinenangaben müssen noch dem Export entsprechen.
    const heute = Object.fromEntries(seiteZerlegen(seite).map((t) => [t.schluessel, t.text]));
    for (const sprache of SPRACHEN) {
      const uebersetzt = Object.fromEntries(
        texte
          .filter((t) => typeof t?.[sprache] === "string" && t[sprache].trim() !== "")
          .filter((t) => {
            if (!t.schluessel.startsWith("@") || heute[t.schluessel] === t.de) return true;
            meldungen.push(`Seite „${seite.slug}“ (${sprache}): ${t.schluessel} wurde seit dem Export geändert – bleibt deutsch.`);
            return false;
          })
          .map((t) => [t.schluessel, t[sprache]]),
      );
      if (Object.keys(uebersetzt).length === 0) continue;
      const { zeile, eingesetzt, ausgelassen } = seiteZusammensetzen(seite, uebersetzt, original);
      if (ausgelassen.length > 0) {
        meldungen.push(`Seite „${seite.slug}“ (${sprache}): ${ausgelassen.length} Texte passen nicht mehr zum Deutschen und bleiben deutsch (${ausgelassen.join(", ")}).`);
      }
      const offen = Object.keys(heute).filter((k) => !k.startsWith("@") && !eingesetzt.includes(k)).length;
      if (offen > 0) meldungen.push(`Seite „${seite.slug}“ (${sprache}): ${offen} Texte ohne Übersetzung bleiben deutsch.`);
      seitenZeilen.push({
        page_id: seite.id, lang: sprache, ...zeile,
        is_machine: maschinell, is_stale: false, reviewed_at: null, reviewed_by: null,
      });
    }
  }

  const deutsch = new Map(rahmentexteSammeln(rahmen).map((z) => [z.schluessel, z.text]));
  for (const t of Array.isArray(datei?.rahmen) ? datei.rahmen : []) {
    const trenner = String(t?.schluessel ?? "").indexOf(":");
    if (!deutsch.has(t?.schluessel) || deutsch.get(t.schluessel) !== t.de) {
      if (SPRACHEN.some((s) => typeof t?.[s] === "string" && t[s].trim() !== "")) {
        meldungen.push(`Rahmentext ${t?.schluessel}: gibt es nicht mehr oder wurde geändert – übersprungen.`);
      }
      continue;
    }
    for (const sprache of SPRACHEN) {
      if (typeof t[sprache] !== "string" || t[sprache].trim() === "") continue;
      textZeilen.push({
        kind: t.schluessel.slice(0, trenner), ref: t.schluessel.slice(trenner + 1), lang: sprache,
        value: t[sprache].trim(), is_machine: maschinell, is_stale: false, reviewed_at: null,
      });
    }
  }
  return { seitenZeilen, textZeilen, meldungen };
}

// ── Ab hier mit Netz und Dateien ────────────────────────────────────────────

async function anfrage(pfad, schluessel, init = {}) {
  const url = process.env.VITE_SUPABASE_URL;
  const antwort = await fetch(`${url}/rest/v1/${pfad}`, {
    ...init,
    headers: { apikey: schluessel, Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (!antwort.ok) throw new Error(`${pfad.split("?")[0]}: ${antwort.status} ${(await antwort.text()).slice(0, 200)}`);
  const text = await antwort.text();
  return text ? JSON.parse(text) : null;
}

/** Der heutige Stand: veröffentlichte Seiten, Menü, öffentliche Vereinsangaben. */
async function standHolen(schluessel) {
  const [seiten, menue, marke, bilder, galerie, besucher, quellen] = await Promise.all([
    anfrage("site_pages?select=id,slug,title,content,seo_title,seo_description&is_published=eq.true&order=slug", schluessel),
    anfrage("site_menu?select=id,label&order=sort_order", schluessel),
    anfrage("rpc/public_branding", schluessel, { method: "POST", body: "{}" }),
    anfrage("site_images?select=slot,label,alt_text&order=slot", schluessel),
    anfrage("gallery_images?select=id,alt_text,epoch&order=epoch", schluessel),
    anfrage("epoch_visitor_items?select=id,text,epoch&order=epoch,sort_order", schluessel),
    anfrage("epoch_sources?select=id,text,epoch&order=epoch,sort_order", schluessel),
  ]);
  return { seiten, menue, marke: Array.isArray(marke) ? marke[0] ?? {} : marke ?? {}, bilder, galerie, besucher, quellen };
}

async function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  const schalter = new Set(rest.filter((a) => a.startsWith("--")));
  const datei = rest.find((a) => !a.startsWith("--"));

  if (!process.env.VITE_SUPABASE_URL) throw new Error("VITE_SUPABASE_URL fehlt (Adresse der Datenbank).");

  if (befehl === "export") {
    const schluessel = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!schluessel) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY fehlt (öffentlicher Schlüssel).");
    const inhalt = exportBauen(await standHolen(schluessel));
    const ziel = datei ?? "seiten-texte.json";
    writeFileSync(ziel, `${JSON.stringify(inhalt, null, 2)}\n`);
    const anzahl = inhalt.seiten.reduce((n, s) => n + s.texte.length, 0) + inhalt.rahmen.length;
    const zeichen = [...inhalt.seiten.flatMap((s) => s.texte), ...inhalt.rahmen].reduce((n, t) => n + t.de.length, 0);
    console.log(`${ziel}: ${inhalt.seiten.length} Seiten, ${anzahl} Texte, ${zeichen} Zeichen je Sprache.`);
    return;
  }

  if (befehl === "import") {
    if (!datei) throw new Error("Welche Datei? node scripts/seiten-uebersetzen.mjs import texte.json");
    const probe = schalter.has("--probe");
    // Zum Lesen reicht in der Probe der öffentliche Schlüssel.
    const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY ?? (probe ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined);
    if (!schluessel) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt (Dienstschlüssel, nur für diesen Aufruf setzen).");
    const inhalt = JSON.parse(readFileSync(datei, "utf8"));
    const { seitenZeilen, textZeilen, meldungen } = importZeilen(inhalt, await standHolen(schluessel), { maschinell: !schalter.has("--von-hand") });
    for (const m of meldungen) console.log(`Hinweis: ${m}`);
    console.log(`${seitenZeilen.length} Sprachfassungen von Seiten, ${textZeilen.length} kurze Texte (Menü, Rahmen, Bilder, Besucherhinweise, Quellen).`);
    if (probe) {
      console.log("Probe: nichts geschrieben.");
      return;
    }
    const schreiben = { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" } };
    if (seitenZeilen.length > 0) {
      await anfrage("site_page_translations?on_conflict=page_id,lang", schluessel, { ...schreiben, body: JSON.stringify(seitenZeilen) });
    }
    if (textZeilen.length > 0) {
      await anfrage("site_text_translations?on_conflict=kind,ref,lang", schluessel, { ...schreiben, body: JSON.stringify(textZeilen) });
    }
    console.log("Geschrieben. Die Fassungen stehen in der Seitenverwaltung zur Durchsicht; online sind sie sofort, im Vorab-HTML nach dem nächsten Bau.");
    return;
  }

  console.log("Aufruf:\n  node scripts/seiten-uebersetzen.mjs export [texte.json]\n  node scripts/seiten-uebersetzen.mjs import texte.json [--probe] [--von-hand]");
  process.exitCode = 1;
}

// Nur beim direkten Aufruf – die Tests binden die Datei ein, ohne dass etwas läuft.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`Abgebrochen: ${e.message}`);
    process.exitCode = 1;
  });
}
