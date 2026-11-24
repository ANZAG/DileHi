import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mitgliedSchluessel } from "@/daten/mitglieder";
import { veranstaltungSchluessel } from "@/daten/veranstaltungen";
import { wahlSchluessel } from "@/daten/wahlen";

/**
 * Die Datenschicht soll nicht wieder zerfasern.
 *
 * Auslöser: Zwei Komponenten nutzten denselben Schlüssel
 * `["source_folders", epoch]` für verschieden geformte Daten – nach dem Besuch
 * der einen Seite zeigte die andere Ordner ohne Namen. Das ging, weil jede
 * Komponente ihre Abfragen und Schlüssel selbst hinschrieb.
 *
 * Für die umgezogenen Bereiche gilt deshalb: Abfragen stehen in `src/daten`,
 * Schlüssel kommen aus dem Schlüsselsatz des Bereichs. Wer einen Bereich
 * umzieht, trägt ihn unten ein.
 */

type Schluesselsatz = Record<string, readonly unknown[] | ((...argumente: never[]) => readonly unknown[])>;

const BEREICHE: { name: string; schluessel: Schluesselsatz; dateien: string[] }[] = [
  {
    name: "wahlen",
    schluessel: wahlSchluessel,
    dateien: ["src/pages/intern/Elections.tsx", ...quelltexte("src/components/elections")],
  },
  {
    // Ohne die öffentliche Anmeldeseite (pages/EventRegistration.tsx): Sie
    // liest für Gäste über einen eigenen Weg und ist noch nicht umgezogen.
    name: "veranstaltungen",
    schluessel: veranstaltungSchluessel,
    dateien: [
      ...quelltexte("src/pages/intern").filter((pfad) => /\/Event[^/]*\.tsx$/.test(pfad)),
      ...quelltexte("src/components/events"),
      ...quelltexte("src/components/event-forms"),
      ...quelltexte("src/components/evaluation"),
    ],
  },
  {
    name: "mitglieder",
    schluessel: mitgliedSchluessel,
    dateien: [],
  },
];

function quelltexte(ordner: string): string[] {
  return readdirSync(ordner)
    .flatMap((eintrag) => {
      const pfad = join(ordner, eintrag).replace(/\\/g, "/");
      return statSync(pfad).isDirectory() ? quelltexte(pfad) : [pfad];
    })
    .filter((pfad) => /\.tsx?$/.test(pfad));
}

const lies = (pfad: string) => readFileSync(pfad, "utf-8");

/** Womit die Schlüssel eines Bereichs beginnen – jede Fabrik einmal aufgerufen. */
function wurzeln(schluessel: Schluesselsatz): string[] {
  const alle = Object.values(schluessel).map((s) =>
    typeof s === "function" ? (s as (...a: string[]) => readonly unknown[])("x", "y", "z") : s,
  );
  return [...new Set(alle.map((s) => String(s[0])))];
}

describe.each(BEREICHE)("Bereich $name", ({ schluessel, dateien }) => {
  it("spricht in Seiten und Komponenten nicht selbst mit der Datenbank", () => {
    // Auch über Zeilen hinweg: `supabase` und `.from(` stehen oft untereinander.
    const direkt = dateien.filter((pfad) => /supabase\s*\.\s*(from|rpc)\s*\(/.test(lies(pfad)));
    expect(direkt).toEqual([]);
  });

  it("schreibt keine Schlüssel von Hand", () => {
    const vonHand = dateien.filter((pfad) => /queryKey:\s*\[/.test(lies(pfad)));
    expect(vonHand).toEqual([]);
  });

  it("liefert für jeden Schlüssel eine Liste, die mit dem Bereich beginnt", () => {
    expect(wurzeln(schluessel).length).toBeGreaterThan(0);
    for (const s of Object.values(schluessel)) {
      const wert = typeof s === "function" ? (s as (...a: string[]) => readonly unknown[])("x", "y", "z") : s;
      expect(Array.isArray(wert)).toBe(true);
      expect(typeof wert[0]).toBe("string");
    }
  });
});

describe("Die Schlüssel der Bereiche", () => {
  it("beginnen in keinen zwei Bereichen gleich", () => {
    const besitzer = new Map<string, string[]>();
    for (const { name, schluessel } of BEREICHE) {
      for (const w of wurzeln(schluessel)) besitzer.set(w, [...(besitzer.get(w) ?? []), name]);
    }
    expect([...besitzer].filter(([, namen]) => namen.length > 1)).toEqual([]);
  });

  it("werden nirgends sonst von Hand nachgebaut", () => {
    // Ein `queryKey: ["wahlen", …]` außerhalb von src/daten wäre genau der
    // zweite Schreiber, aus dem der Fehler mit den Ordnern entstand.
    const eigene = new Set(BEREICHE.flatMap((b) => wurzeln(b.schluessel)));
    const treffer: string[] = [];
    for (const pfad of quelltexte("src")) {
      if (pfad.startsWith("src/daten/") || pfad.startsWith("src/test/")) continue;
      for (const [, wurzel] of lies(pfad).matchAll(/queryKey:\s*\[\s*["'`]([^"'`]+)["'`]/g)) {
        if (eigene.has(wurzel)) treffer.push(`${pfad}: ${wurzel}`);
      }
    }
    expect(treffer).toEqual([]);
  });
});
