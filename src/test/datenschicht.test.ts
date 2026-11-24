import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auslagenSchluessel } from "@/daten/auslagen";
import { beschlussSchluessel } from "@/daten/beschluesse";
import { bibliothekSchluessel } from "@/daten/bibliothek";
import { einstellungSchluessel } from "@/daten/einstellungen";
import { epochenSchluessel } from "@/daten/epochen";
import { einwilligungSchluessel } from "@/daten/einwilligungen";
import { inventarSchluessel } from "@/daten/inventar";
import { mitgliedSchluessel } from "@/daten/mitglieder";
import { nachweisSchluessel } from "@/daten/nachweise";
import { quellenSchluessel } from "@/daten/quellen";
import { sprachSchluessel } from "@/daten/sprachen";
import { veranstaltungSchluessel } from "@/daten/veranstaltungen";
import { wahlSchluessel } from "@/daten/wahlen";
import { zuwendungSchluessel } from "@/daten/zuwendungen";

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
    dateien: [
      "src/components/admin/MemberRegistry.tsx",
      "src/pages/intern/Profile.tsx",
      "src/pages/intern/Contributions.tsx",
      "src/pages/intern/MemberMap.tsx",
    ],
  },
  {
    // Die Sprachfassungen der öffentlichen Seite (en, fr). Das Deutsche –
    // site_pages, Menü, Vereinsangaben – ist noch nicht umgezogen.
    name: "sprachen",
    schluessel: sprachSchluessel,
    dateien: [
      "src/pages/SeiteAnzeigen.tsx",
      "src/pages/intern/UebersetzungsEditor.tsx",
      "src/hooks/useSprache.ts",
      "src/hooks/useSiteMenuInSprache.ts",
      "src/components/Sprachwahl.tsx",
      "src/components/SprachWeiche.tsx",
      "src/components/admin/RahmentexteAdmin.tsx",
      "src/components/admin/SprachfassungenZeile.tsx",
    ],
  },
  {
    name: "auslagen",
    schluessel: auslagenSchluessel,
    dateien: ["src/pages/intern/Auslagen.tsx", "src/hooks/useAuslagen.ts"],
  },
  {
    name: "zuwendungen",
    schluessel: zuwendungSchluessel,
    dateien: ["src/pages/intern/Zuwendungen.tsx"],
  },
  {
    name: "beschluesse",
    schluessel: beschlussSchluessel,
    dateien: ["src/pages/intern/Beschluesse.tsx"],
  },
  {
    name: "inventar",
    schluessel: inventarSchluessel,
    dateien: ["src/pages/intern/Inventar.tsx", "src/hooks/useInventar.ts", ...quelltexte("src/components/inventar")],
  },
  {
    name: "nachweise",
    schluessel: nachweisSchluessel,
    dateien: [
      "src/hooks/useNachweise.ts",
      "src/components/admin/NachweiseAdmin.tsx",
      ...quelltexte("src/components/nachweise"),
    ],
  },
  {
    name: "einwilligungen",
    schluessel: einwilligungSchluessel,
    dateien: [
      "src/hooks/useEinwilligungen.ts",
      "src/components/admin/EinwilligungenAdmin.tsx",
      ...quelltexte("src/components/einwilligungen"),
    ],
  },
  {
    // Ohne src/lib/scan: Dort steht der Text der Quellen (quelltext.ts) neben
    // reinem Bildcode; die drei Aufrufe sind schon Funktionen mit Fehlerprüfung.
    name: "quellen",
    schluessel: quellenSchluessel,
    dateien: [
      "src/pages/intern/Sources.tsx",
      "src/pages/intern/Scannen.tsx",
      "src/components/admin/FileStorageAdmin.tsx",
      ...quelltexte("src/components/scan"),
    ],
  },
  {
    name: "epochen",
    schluessel: epochenSchluessel,
    dateien: [
      "src/components/admin/SourcesAdmin.tsx",
      "src/components/admin/VisitorHighlightsAdmin.tsx",
      ...quelltexte("src/components/epochs"),
    ],
  },
  {
    name: "bibliothek",
    schluessel: bibliothekSchluessel,
    dateien: [
      "src/hooks/useBibliothek.ts",
      ...quelltexte("src/pages/intern/bibliothek"),
      ...quelltexte("src/components/bibliothek"),
    ],
  },
  {
    // Erst die Dateiablage; der Rest der Vereinsangaben folgt mit der Verwaltung.
    name: "einstellungen",
    schluessel: einstellungSchluessel,
    dateien: ["src/pages/intern/Admin.tsx"],
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

/**
 * Wo ein Schlüssel doch noch von Hand steht – jede Ausnahme mit Grund.
 *
 * Die öffentliche Anmeldeseite liest die Zelte des Mitglieds selbst, mit
 * derselben Abfrage wie `ladeZelte`. Sie wird gerade an anderer Stelle
 * umgebaut; bis sie umzieht, teilt sie sich den Eintrag mit dem Profil.
 */
const AUSNAHMEN = ["src/pages/EventRegistration.tsx: member_tents"];

describe.each(BEREICHE)("Bereich $name", ({ schluessel, dateien }) => {
  it("nennt Dateien, die es gibt", () => {
    // Ein Muster, das nach einem Umbenennen nichts mehr trifft, prüfte nichts.
    expect(dateien.length).toBeGreaterThan(0);
  });

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
    expect(treffer.sort()).toEqual(AUSNAHMEN);
  });
});
