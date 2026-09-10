import { readFileSync, readdirSync } from "node:fs";

/**
 * Woher die Tests wissen, was in der Datenbank steht.
 *
 * Bis eben lasen sie einzelne Migrationsdateien. Seit dem Ausgangsstand gibt es
 * die nicht mehr: Achtzig Schritte sind zu einer Datei zusammengefasst, die
 * bisherigen liegen im Archiv.
 *
 * Das ist mehr als ein geänderter Pfad. Eine Migration beschreibt eine
 * *Änderung* („setze diesen Text, falls er noch der ausgelieferte ist"), der
 * Ausgangsstand ein *Ergebnis* („dieser Text steht da"). Prüfungen, die am
 * Wortlaut einer Änderung hingen, prüfen jetzt am Ergebnis — und das ist
 * ohnehin das, was eine neue Installation bekommt.
 */

const ohneCrlf = (text: string) => text.replace(/\r\n/g, "\n");

/** Der Ausgangsstand allein. */
export const AUSGANGSSTAND = ohneCrlf(
  readFileSync("supabase/migrations/00000000000000_ausgangsstand.sql", "utf-8")
);

/**
 * Alles unter migrations/ – der Ausgangsstand und was danach kommt.
 *
 * Beides zusammen ist das, was eine neue Installation bekommt. Nur den
 * Ausgangsstand zu lesen wäre ein unvollständiges Bild.
 */
export const MIGRATIONEN = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ohneCrlf(readFileSync(`supabase/migrations/${f}`, "utf-8")));

/** Die abgelösten Migrationen. Nur für Prüfungen, die wirklich den Weg meinen. */
export const ARCHIV = readdirSync("docs/archiv-migrationen")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ohneCrlf(readFileSync(`docs/archiv-migrationen/${f}`, "utf-8")))
  .join("\n");

/**
 * Die Zeilen, die eine Tabelle beim Aufsetzen bekommt.
 *
 * Zwei Schreibweisen kommen vor, und beide müssen gelesen werden:
 *
 *   Der Ausgangsstand hat je Zeile ein eigenes INSERT — so gibt der Abzug es aus.
 *   Von Hand geschriebene Migrationen fassen zusammen: ein INSERT, viele Zeilen.
 *
 * Der erste Anlauf konnte nur die erste Form. Ergebnis: Die einundzwanzig
 * Schritte der Bereichstouren galten als nicht vorhanden, obwohl sie dastanden.
 * Ein Auslesen, das die Hälfte übersieht, ist schlimmer als keins — es ist grün.
 */
export function startdaten(tabelle: string): Record<string, string | null>[] {
  const zeilen: Record<string, string | null>[] = [];
  const text = MIGRATIONEN.join("\n");
  const kopf = new RegExp(`INSERT INTO public\\.${tabelle}\\s*\\(([^)]*)\\)\\s*VALUES`, "g");

  for (const treffer of text.matchAll(kopf)) {
    const spalten = treffer[1].split(",").map((s) => s.trim());
    for (const werte of tupel(text, treffer.index! + treffer[0].length)) {
      const zeile: Record<string, string | null> = {};
      spalten.forEach((s, i) => {
        zeile[s] = werte[i] ?? null;
      });
      zeilen.push(zeile);
    }
  }
  return zeilen;
}

/**
 * Die Wertelisten einer INSERT-Anweisung ab einer Stelle.
 *
 * Zeichen für Zeichen statt mit einem Muster: In den Texten stehen Klammern,
 * Kommas und Hochkommas (verdoppelt), und jedes Muster, das darüber
 * hinwegliest, greift irgendwann daneben.
 */
function tupel(text: string, ab: number): (string | null)[][] {
  const alle: (string | null)[][] = [];
  let i = ab;

  while (i < text.length) {
    // Bis zur nächsten öffnenden Klammer – oder zum Ende der Anweisung.
    while (i < text.length && text[i] !== "(") {
      if (text[i] === ";") return alle;
      // „ON CONFLICT (key)" gehört nicht mehr zu den Werten.
      if (text.startsWith("ON CONFLICT", i)) return alle;
      i++;
    }
    if (i >= text.length) return alle;

    const werte: (string | null)[] = [];
    let aktuell = "";
    let inText = false;
    let tiefe = 0;
    i++; // über die öffnende Klammer

    for (; i < text.length; i++) {
      const z = text[i];
      if (inText) {
        if (z === "'" && text[i + 1] === "'") {
          aktuell += "'";
          i++;
        } else if (z === "'") {
          inText = false;
        } else {
          aktuell += z;
        }
      } else if (z === "'") {
        inText = true;
      } else if (z === "(") {
        tiefe++;
        aktuell += z;
      } else if (z === ")" && tiefe > 0) {
        tiefe--;
        aktuell += z;
      } else if (z === ")") {
        werte.push(aufbereiten(aktuell));
        i++;
        break;
      } else if (z === "," && tiefe === 0) {
        werte.push(aufbereiten(aktuell));
        aktuell = "";
      } else {
        aktuell += z;
      }
    }
    alle.push(werte);
  }
  return alle;
}

const aufbereiten = (roh: string) => {
  const wert = roh.trim();
  return wert === "NULL" || wert === "" ? null : wert;
};
