/**
 * Prüft die Importe der Edge Functions.
 *
 * Die Funktionen laufen unter Deno und liegen ausserhalb von allem, was `npm
 * run ci` bisher angefasst hat: kein tsc, keine Tests, kein Build. Ein
 * Tippfehler im Importnamen faellt erst beim Deployment auf – oder erst dann,
 * wenn die erste Einladung nicht ankommt.
 *
 * Beim Umbau auf den gemeinsamen Mailversand ist mir genau das passiert: Eine
 * automatische Ersetzung hat in vier Dateien den falschen Import erwischt und
 * dabei `createClient` und die halbe Mail-Werkzeugkiste entfernt. Der Code sah
 * unauffaellig aus.
 *
 * Geprueft wird deshalb:
 *   1. Jeder Name, der aus einem _shared-Modul geholt wird, existiert dort.
 *   2. Jeder geholte Name wird in der Datei auch benutzt.
 *   3. Bekannte Namen aus _shared werden nicht benutzt, ohne geholt zu werden.
 *
 * Das ist kein Typcheck, aber es faengt die Klasse von Fehlern, die hier
 * tatsaechlich vorkommt.
 *
 *   node scripts/funktionen-pruefen.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const WURZEL = "supabase/functions";
const GETEILT = join(WURZEL, "_shared");

/** Die Namen, die ein Modul nach aussen gibt. */
function exportierteNamen(datei) {
  const quelle = readFileSync(datei, "utf-8");
  const namen = new Set();

  // export function x / export async function x / export const x / export class x
  for (const m of quelle.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)) {
    namen.add(m[1]);
  }
  // export interface x / export type x
  for (const m of quelle.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)) {
    namen.add(m[1]);
  }
  // export { a, b } from "..."  und  export type { a } from "..."
  for (const m of quelle.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
    for (const teil of m[1].split(",")) {
      const name = teil.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) namen.add(name);
    }
  }
  return namen;
}

const module = new Map();
for (const datei of readdirSync(GETEILT)) {
  if (datei.endsWith(".ts")) module.set(datei, exportierteNamen(join(GETEILT, datei)));
}

let fehler = 0;

for (const ordner of readdirSync(WURZEL)) {
  if (ordner === "_shared") continue;
  const datei = join(WURZEL, ordner, "index.ts");
  if (!existsSync(datei)) continue;

  const quelle = readFileSync(datei, "utf-8");
  const meldungen = [];

  // Alle Importe aus _shared einsammeln.
  const geholt = new Map(); // Name -> Modul
  for (const m of quelle.matchAll(
    /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"\.\.\/_shared\/([\w.-]+)"/g
  )) {
    const modul = m[2];
    if (!module.has(modul)) {
      meldungen.push(`Modul ../_shared/${modul} gibt es nicht`);
      continue;
    }
    for (const teil of m[1].split(",")) {
      const roh = teil.trim();
      if (!roh) continue;
      // `type X` und `X as Y` beide auf den blossen Namen bringen.
      const name = roh.split(/\s+as\s+/).pop().trim().replace(/^type\s+/, "");
      const quellName = roh.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
      if (!module.get(modul).has(quellName)) {
        meldungen.push(`${quellName} wird aus ${modul} geholt, steht dort aber nicht`);
      }
      geholt.set(name, modul);
    }
  }

  // Der Rumpf ohne die Importzeilen – sonst zaehlt der Import sich selbst.
  const rumpf = quelle.replace(/^import[\s\S]*?from\s*"[^"]+";$/gm, "");

  for (const [name] of geholt) {
    if (!new RegExp(`\\b${name}\\b`).test(rumpf)) {
      meldungen.push(`${name} wird geholt, aber nicht benutzt`);
    }
  }

  // Umgekehrt: benutzt, aber nicht geholt. Nur fuer Namen, die es in _shared
  // wirklich gibt – alles andere kann eine eigene Funktion der Datei sein.
  //
  // Eine gleichnamige eigene Funktion ist ausdruecklich erlaubt: `embed`
  // bringt sein eigenes escapeHtml mit, weil es sonst wegen einer einzigen
  // Zeile das Mailmodul samt SMTP-Bibliothek laden muesste.
  const eigene = new Set(
    [...rumpf.matchAll(/^\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)]
      .map((m) => m[1])
  );

  for (const [modul, namen] of module) {
    for (const name of namen) {
      if (geholt.has(name) || eigene.has(name)) continue;
      // Aufruf oder Verwendung als Wert, nicht als Teil eines laengeren Namens.
      if (new RegExp(`\\b${name}\\s*\\(`).test(rumpf)) {
        meldungen.push(`${name} wird benutzt, aber nicht aus ${modul} geholt`);
      }
    }
  }

  if (meldungen.length > 0) {
    fehler += meldungen.length;
    console.log(`${ordner}`);
    for (const m of meldungen) console.log(`   – ${m}`);
  }
}

console.log(
  fehler === 0
    ? "Edge Functions: Importe in Ordnung."
    : `Edge Functions: ${fehler} Problem(e).`
);
process.exit(fehler > 0 ? 1 : 0);
