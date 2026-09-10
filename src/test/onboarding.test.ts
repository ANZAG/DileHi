import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZEICHEN_NAMEN, zeichen } from "@/components/onboarding/icons";

/*
 * Zeilenenden vereinheitlichen.
 *
 * Git legt die Dateien unter Windows mit CRLF im Arbeitsverzeichnis ab. Ein
 * Muster, das auf einen Zeilenumbruch prueft, traf danach nichts mehr, und
 * der Test wurde rot, ohne dass sich am Inhalt etwas geaendert hatte.
 */
const lies = (datei: string) =>
  readFileSync(datei, "utf-8").replace(/\r\n/g, "\n");

// Die erste Migration legt die Tabellen und onboarding_erledigt() an, die
// zweite die Touren. Geprueft wird gegen beide.
const migration =
  lies("supabase/migrations/20260909260000_onboarding.sql") +
  lies("supabase/migrations/20260909280000_rundgang.sql");

describe("Zeichen der Schritte", () => {
  it("liefert für einen unbekannten Namen etwas Brauchbares", () => {
    // Ein Tippfehler in der Verwaltung soll keinen leeren Kasten hinterlassen.
    expect(zeichen("GibtEsNicht")).toBeTruthy();
    expect(zeichen(null)).toBeTruthy();
  });

  it("kennt jedes Zeichen, das die Migration vergibt", () => {
    const benutzt = [...migration.matchAll(/\n {2}\('[a-z_]+', '\w+', '(\w+)',/g)].map((m) => m[1]);
    expect(benutzt.length).toBeGreaterThan(15);
    expect(benutzt.filter((n) => !ZEICHEN_NAMEN.includes(n))).toEqual([]);
  });
});

/**
 * Die Verkabelung.
 *
 * Ein Anker ohne Gegenstück im Markup fällt niemandem auf: Die Führung zeigt
 * dann einfach ein Fenster in der Mitte, so wie vorher. Genau deshalb steht
 * das hier.
 */
describe("Anker der Führung", () => {
  /**
   * Alle Bausteine, nicht nur die Seiten.
   *
   * Vorher sah der Test in src/pages/intern nach und in einer Datei daneben.
   * Ein Anker in einer Komponente galt damit als fehlend, obwohl er da war –
   * die Pruefung war zu eng und haette bald jeden zweiten Umbau blockiert.
   */
  const alleDateien = (ordner: string): string[] =>
    readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? alleDateien(`${ordner}/${e.name}`)
        : e.name.endsWith(".tsx")
          ? [`${ordner}/${e.name}`]
          : []
    );

  const quellen = alleDateien("src").map((f) => readFileSync(f, "utf-8")).join("\n");

  const anker = [...new Set(
    [...migration.matchAll(/'([a-z]+-[a-z_]+)', (?:'[a-z_.]+'|NULL), (?:'[a-z_]+'|NULL)/g)]
      .map((m) => m[1])
  )];

  it("findet überhaupt Anker in der Migration", () => {
    expect(anker.length).toBeGreaterThan(8);
  });

  it("hat zu jedem Anker ein Element im Markup", () => {
    const fehlend = anker.filter((a) => {
      // Kacheln werden aus dem Schluessel gebaut: data-tour={`kachel-${...}`}
      if (a.startsWith("kachel-")) return !quellen.includes("data-tour={`kachel-");
      return !quellen.includes(`data-tour="${a}"`);
    });
    expect(fehlend).toEqual([]);
  });
});

describe("Aufgaben", () => {
  it("prüft jede Aufgabe in der Datenbank nach", () => {
    // Eine Aufgabe ohne Zweig in onboarding_erledigt() liesse sich nie
    // abhaken – die Liste bliebe fuer immer stehen.
    const vergeben = [...new Set(
      [...migration.matchAll(/(?:'[a-z_]+'|NULL), ('[a-z_]+'|NULL), \d+\),?\n/g)]
        .map((m) => m[1])
        .filter((x) => x !== "NULL")
        .map((x) => x.replace(/'/g, ""))
    )];
    expect(vergeben.length).toBeGreaterThan(5);
    const funktion = migration.slice(
      migration.indexOf("FUNCTION public.onboarding_erledigt"),
      migration.indexOf("GRANT EXECUTE ON FUNCTION public.onboarding_erledigt")
    );
    expect(vergeben.filter((a) => !funktion.includes(`'${a}'`))).toEqual([]);
  });
});

describe("Die drei Fehler der Vorgängerfassung", () => {
  const tour = readFileSync("src/components/onboarding/OnboardingTour.tsx", "utf-8");
  const karte = readFileSync("src/components/onboarding/ErsteSchritte.tsx", "utf-8");

  it("startet nicht mehr von selbst", () => {
    // Vorher schob die Tour Leute quer durch die Anwendung, sobald sie den
    // Mitgliederbereich betraten. Jetzt nur auf Aufforderung.
    expect(tour).toContain("start-onboarding");
    expect(tour).not.toContain("angeboten.current");
  });

  it("verbrennt beim Schliessen nicht den Rest", () => {
    // Der alte Fehler war ein merken() ueber alle restlichen Schritte.
    expect(tour).not.toContain("liste.slice(index).map");
    expect(tour).toContain("merken([aktuell.key]);");
  });

  it("hakt Aufgaben nicht von Hand ab", () => {
    // Ein Haekchen, das man setzen kann, ohne die Sache getan zu haben, waere
    // nur eine hoeflichere Diashow.
    expect(karte).toContain("a.fertig");
    expect(karte).not.toContain('merken([');
  });
});

describe("Inhalte sind pflegbar", () => {
  it("holt die Schritte aus der Datenbank, nicht aus dem Quelltext", () => {
    const hook = readFileSync("src/components/onboarding/useOnboarding.ts", "utf-8");
    expect(hook).toContain('from("onboarding_schritte")');
  });

  it("hat einen Platz in der Verwaltung", () => {
    const admin = readFileSync("src/pages/intern/Admin.tsx", "utf-8");
    expect(admin).toContain("OnboardingAdmin");
    expect(admin).toContain('"erstesschritte"');
  });

  it("hält den Auslieferungszustand fest", () => {
    expect(migration).toContain("SET standard = jsonb_build_object");
    const admin = readFileSync("src/components/admin/OnboardingAdmin.tsx", "utf-8");
    expect(admin).toContain("Auslieferungszustand");
  });
});

/**
 * Der Rundgang folgt der Lesereihenfolge der Startseite.
 *
 * Das war der eigentliche Vorwurf an die erste Fassung: Sie sprang. Wenn die
 * Hervorhebung von oben links nach unten rechts wandert, merkt das niemand –
 * und wenn sie springt, merkt es jeder sofort.
 */
describe("Reihenfolge des Rundgangs", () => {
  const rundgang = lies("supabase/migrations/20260909280000_rundgang.sql");
  const dashboard = lies("src/pages/intern/Dashboard.tsx");

  /** Die Anker der Tour „start", in der Reihenfolge der Migration. */
  const ankerFolge = [...rundgang.matchAll(/'(kachel-[a-z_]+)'/g)].map((m) => m[1]);

  /** Die Kacheln der Startseite, in der Reihenfolge des Markups. */
  const kachelFolge = [...dashboard.matchAll(/modul: "([a-z_]+)"/g)].map((m) => `kachel-${m[1]}`);

  it("findet beide Reihenfolgen", () => {
    expect(ankerFolge.length).toBeGreaterThan(4);
    expect(kachelFolge.length).toBeGreaterThan(4);
  });

  it("hebt die Kacheln in der Reihenfolge hervor, in der sie stehen", () => {
    // Nur die Kacheln vergleichen, die der Rundgang ueberhaupt anspricht:
    // „Anmeldungen" etwa taucht nur bei Organisatoren auf und bleibt aussen vor.
    const erwartet = kachelFolge.filter((k) => ankerFolge.includes(k));
    expect(ankerFolge.filter((a) => erwartet.includes(a))).toEqual(erwartet);
  });

  it("wechselt waehrend des Rundgangs die Seite nicht", () => {
    // Bis auf den letzten Schritt, der bewusst ins Profil fuehrt.
    const routen = [...rundgang.matchAll(/'(\/intern[a-z/]*)', /g)].map((m) => m[1]);
    const bisZumSchluss = routen.slice(0, routen.indexOf("/intern/profil"));
    expect(bisZumSchluss.length).toBeGreaterThan(5);
    expect([...new Set(bisZumSchluss)]).toEqual(["/intern"]);
  });
});
