// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZEICHEN_NAMEN, zeichen } from "@/components/onboarding/icons";
import { functionSource, seedRows } from "./hilfe/buehne";

/**
 * Die Einführung: stimmt, was in der Datenbank steht, mit dem Programm überein?
 *
 * Geprüft wird an der Bühne, auf der alle Migrationen gelaufen sind – also an
 * dem, was eine neue Installation wirklich bekommt. Vorher wurden die
 * INSERT-Anweisungen im Text zerlegt: fragil, zweimal still danebengegriffen,
 * und nach der Umbenennung ins Englische hätten die Prüfungen die alten Namen
 * gesucht.
 */

/** Alle .tsx unter src – Anker und Tournamen können überall stehen. */
const alleDateien = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? alleDateien(`${ordner}/${e.name}`)
      : e.name.endsWith(".tsx")
        ? [`${ordner}/${e.name}`]
        : []
  );

const QUELLEN = alleDateien("src").map((f) => readFileSync(f, "utf-8")).join("\n");

type Step = { key: string; icon: string | null; anchor: string | null; task: string | null;
  tour: string | null; route: string | null; sort_order: number; defaults: Record<string, unknown> | null };
const SCHRITTE = await seedRows<Step>("onboarding_steps");
const HILFEN = await seedRows<{ key: string }>("onboarding_help");

describe("Die Einführung ist überhaupt da", () => {
  it("bringt Schritte und Hilfetexte mit", () => {
    // Schuetzt vor dem stillen Gegenteil: Greift das Auslesen einmal daneben,
    // liefen alle Pruefungen unten ueber leere Listen und waeren gruen.
    expect(SCHRITTE.length).toBeGreaterThan(20);
    expect(HILFEN.length).toBeGreaterThan(8);
  });
});

describe("Zeichen der Schritte", () => {
  it("liefert für einen unbekannten Namen etwas Brauchbares", () => {
    // Ein Tippfehler in der Verwaltung soll keinen leeren Kasten hinterlassen.
    expect(zeichen("GibtEsNicht")).toBeTruthy();
    expect(zeichen(null)).toBeTruthy();
  });

  it("kennt jedes Zeichen, das die Datenbank vergibt", () => {
    const unbekannt = SCHRITTE.map((s) => s.icon)
      .filter((n): n is string => !!n)
      .filter((n) => !ZEICHEN_NAMEN.includes(n));
    expect([...new Set(unbekannt)]).toEqual([]);
  });
});

/**
 * Die Verkabelung.
 *
 * Ein Anker ohne Gegenstück im Markup fällt niemandem auf: Die Führung zeigt
 * dann einfach ein Fenster in der Mitte, so wie vorher.
 */
describe("Anker der Führung", () => {
  const anker = [...new Set(SCHRITTE.map((s) => s.anchor).filter((a): a is string => !!a))];

  it("hat zu jedem Anker ein Element im Markup", () => {
    expect(anker.length).toBeGreaterThan(8);
    const fehlend = anker.filter((a) =>
      // Kacheln entstehen aus dem Schluessel: data-tour={`kachel-${…}`}.
      // Sonst steht der Name irgendwo im Ausdruck – er kommt nirgends sonst vor.
      a.startsWith("kachel-")
        ? !QUELLEN.includes("data-tour={`kachel-")
        : !QUELLEN.includes(`"${a}"`)
    );
    expect(fehlend).toEqual([]);
  });
});

describe("Aufgaben", () => {
  it("prüft jede Aufgabe in der Datenbank nach", async () => {
    // Eine Aufgabe ohne Zweig in onboarding_completed_tasks() liesse sich nie
    // abhaken – die Liste bliebe fuer immer stehen.
    const aufgaben = [...new Set(SCHRITTE.map((s) => s.task).filter((a): a is string => !!a))];
    expect(aufgaben.length).toBeGreaterThan(3);

    const funktion = await functionSource("onboarding_completed_tasks");
    expect(aufgaben.filter((a) => !funktion.includes(`'${a}'`))).toEqual([]);
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
    expect(tour).not.toContain("liste.slice(index).map");
    expect(tour).toContain("merken([aktuell.key]);");
  });

  it("hakt Aufgaben nicht von Hand ab", () => {
    // Ein Haekchen, das man setzen kann, ohne die Sache getan zu haben, waere
    // nur eine hoeflichere Diashow.
    expect(karte).toContain("a.fertig");
    expect(karte).not.toContain("merken([");
  });
});

describe("Inhalte sind pflegbar", () => {
  it("holt die Schritte aus der Datenbank, nicht aus dem Quelltext", () => {
    const hook = readFileSync("src/components/onboarding/useOnboarding.ts", "utf-8");
    expect(hook).toContain('from("onboarding_steps")');
  });

  it("hat einen Platz in der Verwaltung", () => {
    const admin = readFileSync("src/pages/intern/Admin.tsx", "utf-8");
    expect(admin).toContain("OnboardingAdmin");
    expect(admin).toContain('"erstesschritte"');
  });

  it("hält den Auslieferungszustand fest", () => {
    // Ohne `defaults` gaebe es keinen Weg zurueck, wenn jemand einen Text
    // ueberschreibt. Jede Zeile braucht ihn, auch die aus spaeteren
    // Migrationen – und mit englischen Schluesseln, sonst setzt „Zuruecksetzen"
    // nichts zurueck.
    expect(SCHRITTE.filter((s) => !s.defaults || Object.keys(s.defaults).length === 0).map((s) => s.key)).toEqual([]);
    expect(SCHRITTE.filter((s) => !("title" in (s.defaults ?? {}))).map((s) => s.key)).toEqual([]);

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
  const dashboard = readFileSync("src/pages/intern/Dashboard.tsx", "utf-8");

  const rundgang = SCHRITTE.filter((s) => s.tour === "start").sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order)
  );

  it("besteht überhaupt aus Schritten", () => {
    expect(rundgang.length).toBeGreaterThan(8);
  });

  it("hebt die Kacheln in der Reihenfolge hervor, in der sie stehen", () => {
    const inTour = rundgang
      .map((s) => s.anchor)
      .filter((a): a is string => !!a && a.startsWith("kachel-"));
    const imMarkup = [...dashboard.matchAll(/module: "([a-z_]+)"/g)].map((m) => `kachel-${m[1]}`);

    // Nur die Kacheln vergleichen, die der Rundgang anspricht: „Anmeldungen"
    // taucht nur bei Organisatoren auf und bleibt aussen vor.
    const erwartet = imMarkup.filter((k) => inTour.includes(k));
    expect(erwartet.length).toBeGreaterThan(4);
    expect(inTour.filter((a) => erwartet.includes(a))).toEqual(erwartet);
  });

  it("wechselt während des Rundgangs die Seite nicht", () => {
    // Bis auf den letzten Schritt, der bewusst ins Profil fuehrt.
    const routen = rundgang.map((s) => s.route);
    expect([...new Set(routen.slice(0, -1))]).toEqual(["/intern"]);
    expect(routen[routen.length - 1]).toBe("/intern/profil");
  });
});

/**
 * Die Bereichstouren.
 *
 * Zwei Fehler, die man nicht sieht: ein Tippfehler im Tournamen (dann zeigt der
 * Streifen nie etwas) und eine Route an einem Schritt (dann verlässt die Tour
 * mitten in der Erklärung die Seite, auf der sie erklärt).
 */
describe("Bereichstouren", () => {
  const vorhanden = new Set(SCHRITTE.map((s) => s.tour).filter((t): t is string => !!t));

  const benutzt = [...new Set(
    [...QUELLEN.matchAll(/(?<!data-)tour="([a-z]+)"/g)].map((m) => m[1])
  )];

  it("findet beide Seiten der Verkabelung", () => {
    expect(vorhanden.size).toBeGreaterThan(4);
    expect(benutzt.length).toBeGreaterThan(4);
  });

  it("beruft sich nur auf Touren, die es gibt", () => {
    expect(benutzt.filter((t) => !vorhanden.has(t))).toEqual([]);
  });

  it("lässt jede Tour auch anbieten oder aufrufen", () => {
    // Eine Tour in der Datenbank, die kein Streifen und kein Fragezeichen
    // erreicht, kann niemand starten. „profil" ist die Aufgabenliste und
    // braucht keinen.
    expect([...vorhanden].filter((t) => t !== "profil" && !benutzt.includes(t))).toEqual([]);
  });

  it("navigiert in einer Bereichstour nicht weg", () => {
    const bereichsschritte = SCHRITTE.filter(
      (s) => s.tour !== "start" && s.tour !== "profil"
    );
    expect(bereichsschritte.length).toBeGreaterThan(10);
    expect(bereichsschritte.filter((s) => s.route)).toEqual([]);
  });
});

/**
 * Die Hilfetexte am Feld.
 *
 * Zwei stille Fehler: ein Fragezeichen ohne Text (dann erscheint gar nichts,
 * und niemand merkt, dass die Erklärung fehlt) und ein Text ohne Fragezeichen
 * (dann steht er in der Verwaltung und wird nie gezeigt).
 */
describe("Hilfe am Feld", () => {
  const vorhanden = HILFEN.map((h) => h.key).filter((k): k is string => !!k);
  const benutzt = [...new Set(
    [...QUELLEN.matchAll(/Hilfe k="([a-z_]+)"/g)].map((m) => m[1])
  )];

  it("findet beide Seiten", () => {
    expect(vorhanden.length).toBeGreaterThan(8);
    expect(benutzt.length).toBeGreaterThan(8);
  });

  it("hat zu jedem Fragezeichen einen Text", () => {
    expect(benutzt.filter((k) => !vorhanden.includes(k))).toEqual([]);
  });

  it("zeigt jeden Text auch irgendwo an", () => {
    expect(vorhanden.filter((k) => !benutzt.includes(k))).toEqual([]);
  });
});
