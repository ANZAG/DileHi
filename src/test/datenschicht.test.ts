import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ankuendigungSchluessel } from "@/daten/ankuendigungen";
import { aufnahmeSchluessel } from "@/daten/aufnahme";
import { auslagenSchluessel } from "@/daten/auslagen";
import { beitragsstufenSchluessel } from "@/daten/beitragsstufen";
import { benachrichtigungSchluessel } from "@/daten/benachrichtigungen";
import { beschlussSchluessel } from "@/daten/beschluesse";
import { bibliothekSchluessel } from "@/daten/bibliothek";
import { darstellungSchluessel } from "@/daten/darstellungen";
import { dokumentSchluessel } from "@/daten/dokumente";
import { einfuehrungSchluessel } from "@/daten/einfuehrung";
import { einstellungSchluessel } from "@/daten/einstellungen";
import { epochenSchluessel } from "@/daten/epochen";
import { forumSchluessel } from "@/daten/forum";
import { fristSchluessel } from "@/daten/fristen";
import { einwilligungSchluessel } from "@/daten/einwilligungen";
import { inventarSchluessel } from "@/daten/inventar";
import { kategorieSchluessel } from "@/daten/kategorien";
import { mitgliedSchluessel } from "@/daten/mitglieder";
import { nachweisSchluessel } from "@/daten/nachweise";
import { quellenSchluessel } from "@/daten/quellen";
import { rollenSchluessel } from "@/daten/rollen";
import { sprachSchluessel } from "@/daten/sprachen";
import { veranstaltungSchluessel } from "@/daten/veranstaltungen";
import { wahlSchluessel } from "@/daten/wahlen";
import { websiteSchluessel } from "@/daten/website";
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
    dateien: [
      "src/pages/intern/Elections.tsx",
      "src/components/admin/AuditLogPanel.tsx",
      "src/components/admin/ContactMessages.tsx",
      ...quelltexte("src/components/elections"),
    ],
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
      "src/pages/intern/Auswertungen.tsx",
      "src/components/admin/FormTemplateAdmin.tsx",
    ],
  },
  {
    name: "mitglieder",
    schluessel: mitgliedSchluessel,
    dateien: [
      "src/components/admin/MemberRegistry.tsx",
      "src/components/admin/ProfilfelderAdmin.tsx",
      "src/hooks/useProfilfelder.ts",
      "src/components/admin/MitgliederImport.tsx",
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
    // Vereinsangaben, Erscheinungsbild, Dateiablage, Module.
    name: "einstellungen",
    schluessel: einstellungSchluessel,
    dateien: [
      "src/pages/intern/Admin.tsx",
      "src/hooks/useBranding.ts",
      "src/hooks/useModule.ts",
      "src/components/admin/ErscheinungsbildAdmin.tsx",
      "src/components/admin/ModuleAdmin.tsx",
      "src/components/admin/OrganisationsformWahl.tsx",
      "src/components/admin/SatzungEinstellung.tsx",
      "src/components/admin/Einrichtungsprozess.tsx",
      "src/components/admin/Einrichtungsassistent.tsx",
    ],
  },
  {
    name: "rollen",
    schluessel: rollenSchluessel,
    dateien: [
      "src/components/admin/RollenAdmin.tsx",
      "src/components/admin/RolesPermissionsPanel.tsx",
      "src/hooks/useDefaultRole.ts",
    ],
  },
  {
    name: "fristen",
    schluessel: fristSchluessel,
    dateien: ["src/components/admin/FristenAdmin.tsx"],
  },
  {
    // Die Auswahlliste selbst liest der Baukasten (sitebuilder/auswahl.ts).
    name: "kategorien",
    schluessel: kategorieSchluessel,
    dateien: ["src/components/admin/KategorienAdmin.tsx", "src/hooks/useKategorien.ts"],
  },
  {
    // Menü, Galerie, Bilder, Kontaktnachrichten. Die Seiten selbst und die
    // Bausteine (components/sitebuilder) sind noch nicht umgezogen.
    name: "website",
    schluessel: websiteSchluessel,
    dateien: [
      "src/components/admin/MenueAdmin.tsx",
      "src/components/admin/GalleryAdmin.tsx",
      "src/components/admin/SitePagesAdmin.tsx",
      "src/pages/intern/SeitenEditor.tsx",
      "src/hooks/useSiteMenu.ts",
      "src/hooks/useSiteImage.ts",
    ],
  },
  {
    name: "aufnahme",
    schluessel: aufnahmeSchluessel,
    dateien: [
      "src/components/admin/MemberApplicationsAdmin.tsx",
      "src/components/admin/AntragsfelderAdmin.tsx",
      "src/components/admin/VorlagenAdmin.tsx",
      "src/hooks/useAntragsfelder.ts",
      "src/hooks/useAntragstexte.ts",
    ],
  },
  {
    name: "ankuendigungen",
    schluessel: ankuendigungSchluessel,
    dateien: ["src/pages/intern/Announcements.tsx"],
  },
  {
    name: "forum",
    schluessel: forumSchluessel,
    dateien: [
      ...quelltexte("src/pages/intern").filter((pfad) => /\/Forum[^/]*\.tsx$/.test(pfad)),
      ...quelltexte("src/components/forum"),
      "src/components/admin/ForumCategoriesAdmin.tsx",
    ],
  },
  {
    name: "benachrichtigungen",
    schluessel: benachrichtigungSchluessel,
    dateien: ["src/components/NotificationBell.tsx", "src/components/PushToggle.tsx"],
  },
  {
    name: "dokumente",
    schluessel: dokumentSchluessel,
    dateien: [
      "src/pages/intern/Documents.tsx",
      "src/hooks/useDokumentkategorien.ts",
      "src/components/admin/DokumentkategorienAdmin.tsx",
    ],
  },
  {
    name: "einfuehrung",
    schluessel: einfuehrungSchluessel,
    dateien: [
      "src/components/Hilfe.tsx",
      "src/components/admin/OnboardingAdmin.tsx",
      ...quelltexte("src/components/onboarding"),
    ],
  },
  {
    name: "darstellungen",
    schluessel: darstellungSchluessel,
    dateien: [
      "src/components/PublicPersonasSection.tsx",
      "src/components/admin/PersonaPublishAdmin.tsx",
      ...quelltexte("src/components/personas"),
    ],
  },
  {
    name: "beitragsstufen",
    schluessel: beitragsstufenSchluessel,
    dateien: [
      "src/hooks/useBeitragsstufen.ts",
      "src/hooks/useBeitragsmodell.ts",
      ...quelltexte("src/components/beitraege"),
    ],
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
 * Der Galerie-Baustein liest seine Bilder je Kategorie selbst. Der Baukasten
 * ist noch nicht umgezogen; die Galerieverwaltung macht seine Listen über
 * denselben Anfang ungültig.
 */
const AUSNAHMEN = ["src/components/sitebuilder/bausteine.tsx: gallery_images"];

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
