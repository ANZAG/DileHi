import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZEICHEN_NAMEN, zeichen } from "@/components/onboarding/icons";

/*
 * Zeilenenden vereinheitlichen.
 *
 * Git legt die Datei unter Windows mit CRLF im Arbeitsverzeichnis ab. Ein
 * Muster, das auf einen Zeilenumbruch prueft, traf danach nichts mehr, und
 * der Test wurde rot, ohne dass sich am Inhalt etwas geaendert hatte.
 */
const migration = readFileSync(
  "supabase/migrations/20260909260000_onboarding.sql",
  "utf-8"
).replace(/\r\n/g, "\n");

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
  const quellen = [
    ...readdirSync("src/pages/intern").map((f) => `src/pages/intern/${f}`),
    "src/components/personas/PersonaEditor.tsx",
  ]
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(f, "utf-8"))
    .join("\n");

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
