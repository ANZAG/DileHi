import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Die Datenschicht soll nicht wieder zerfasern.
 *
 * Auslöser: Zwei Komponenten nutzten denselben Schlüssel
 * `["source_folders", epoch]` für verschieden geformte Daten – nach dem Besuch
 * der einen Seite zeigte die andere Ordner ohne Namen. Das ging, weil jede
 * Komponente ihre Abfragen und Schlüssel selbst hinschrieb.
 *
 * Seit der dritten Runde gilt die Regel ohne Liste von Bereichen: Mit der
 * Datenbank spricht nur `src/daten`, und Schlüssel kommen aus den
 * Schlüsselsätzen dort. Speicher (`supabase.storage`), Anmeldung
 * (`supabase.auth`), Echtzeit und Edge Functions sind davon nicht berührt.
 */

type Schluesselsatz = Record<string, readonly unknown[] | ((...argumente: never[]) => readonly unknown[])>;

function quelltexte(ordner: string): string[] {
  return readdirSync(ordner)
    .flatMap((eintrag) => {
      const pfad = join(ordner, eintrag).replace(/\\/g, "/");
      return statSync(pfad).isDirectory() ? quelltexte(pfad) : [pfad];
    })
    .filter((pfad) => /\.tsx?$/.test(pfad));
}

const lies = (pfad: string) => readFileSync(pfad, "utf-8");

/** Alles, was nicht selbst Datenschicht, Test oder erzeugter Client ist. */
const UEBRIGE = quelltexte("src").filter(
  (pfad) => !/^src\/(daten|test|integrations)\//.test(pfad),
);

/**
 * Dateien ausserhalb von `src/daten`, die doch mit der Datenbank sprechen
 * dürfen – jede mit Grund. Zur Zeit keine.
 */
const DARF_ABFRAGEN: string[] = [];

/** Dateien, in denen doch ein Schlüssel von Hand steht – jede mit Grund. Zur Zeit keine. */
const DARF_SCHLUESSEL_SCHREIBEN: string[] = [];

/** Die Schlüsselsätze aller Module: Jede Datei in `src/daten`, die einen `…Schluessel` exportiert. */
const module = Object.entries(import.meta.glob<Record<string, unknown>>("../daten/*.ts", { eager: true })).map(
  ([datei, exporte]) => {
    // Ein Schlüsselsatz ist ein Objekt; Funktionen wie `ladeFormularMitSchluessel` sind keiner.
    const saetze = Object.entries(exporte).filter(
      ([name, wert]) => /Schluessel$/.test(name) && typeof wert === "object" && wert !== null,
    );
    return { pfad: datei.replace("../", "src/"), saetze: saetze as [string, Schluesselsatz][] };
  },
);
const SAETZE = module.flatMap((m) => m.saetze.map(([name, schluessel]) => ({ name, schluessel, pfad: m.pfad })));

/** Jeden Schlüssel eines Satzes einmal erzeugt. */
const erzeugt = (schluessel: Schluesselsatz): readonly unknown[][] =>
  Object.values(schluessel).map((s) =>
    typeof s === "function" ? ((s as (...a: string[]) => readonly unknown[])("x", "y", "z") as unknown[]) : (s as unknown[]),
  );

describe("Mit der Datenbank spricht nur src/daten", () => {
  it("findet überhaupt Dateien", () => {
    // Ein Muster, das nach einem Umbenennen nichts mehr trifft, prüfte nichts.
    expect(UEBRIGE.length).toBeGreaterThan(200);
    expect(SAETZE.length).toBeGreaterThan(20);
  });

  it("keine Seite, Komponente, kein Hook und keine Hilfsdatei ruft supabase.from oder supabase.rpc", () => {
    // Auch über Zeilen hinweg: `supabase` und `.from(` stehen oft untereinander.
    // `supabase.storage.from(…)` ist der Speicher und nicht gemeint.
    const direkt = UEBRIGE.filter((pfad) => /supabase\s*\.\s*(from|rpc)\s*\(/.test(lies(pfad)));
    expect(direkt.sort()).toEqual(DARF_ABFRAGEN);
  });

  it("niemand schreibt einen Schlüssel von Hand", () => {
    const vonHand = UEBRIGE.filter((pfad) => /queryKey:\s*\[/.test(lies(pfad)));
    expect(vonHand.sort()).toEqual(DARF_SCHLUESSEL_SCHREIBEN);
  });

  it("auch die Datenschicht selbst schreibt Schlüssel nur in ihre Schlüsselsätze", () => {
    const vonHand = quelltexte("src/daten").filter((pfad) => /queryKey:\s*\[/.test(lies(pfad)));
    expect(vonHand).toEqual([]);
  });
});

describe.each(SAETZE)("$name ($pfad)", ({ schluessel }) => {
  it("liefert für jeden Schlüssel eine Liste, die mit demselben Wort beginnt", () => {
    const anfaenge = new Set(
      erzeugt(schluessel).map((wert) => {
        expect(Array.isArray(wert)).toBe(true);
        expect(typeof wert[0]).toBe("string");
        return String(wert[0]);
      }),
    );
    // Ein Satz, ein Anfang: So macht `alle` wirklich alles ungültig, und kein
    // Schlüssel liegt unter einem Anfang, den ein anderes Modul für seinen hält.
    expect([...anfaenge]).toHaveLength(1);
  });

  it("macht mit `alle` – wo es das gibt – das ganze Modul ungültig", () => {
    // Nicht jeder Satz hat es (die Sprachfassungen erneuern gezielt).
    if (!("alle" in schluessel)) return;
    const alle = schluessel.alle as readonly unknown[];
    expect(Array.isArray(alle)).toBe(true);
    expect(alle).toHaveLength(1);
  });

  it("gibt keinen Schlüssel zweimal aus", () => {
    // Zwei Namen für denselben Schlüssel sind zwei Abfragen unter einem
    // Eintrag – der Fehler, aus dem diese Schicht entstand.
    const alle = erzeugt(schluessel).map((s) => JSON.stringify(s));
    const doppelt = alle.filter((s, i) => alle.indexOf(s) !== i);
    expect(doppelt).toEqual([]);
  });
});

describe("Die Schlüssel der Module", () => {
  it("beginnen in keinen zwei Modulen gleich", () => {
    const besitzer = new Map<string, string[]>();
    for (const { name, schluessel } of SAETZE) {
      const anfang = String(erzeugt(schluessel)[0][0]);
      besitzer.set(anfang, [...(besitzer.get(anfang) ?? []), name]);
    }
    expect([...besitzer].filter(([, namen]) => namen.length > 1)).toEqual([]);
  });
});
