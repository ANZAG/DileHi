// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Zwei Kleinigkeiten, die eine frische Installation sofort sieht.
 *
 * Beide sind in Sekunden wieder kaputt und in beiden Fällen merkt es niemand,
 * weil sie nichts zum Absturz bringen: Ein falscher Titel steht nur im
 * Browserreiter, und eine Kachel zu viel sieht aus wie eine Kachel.
 */

const lies = (p: string) => readFileSync(p, "utf8");

describe("Der Titel im Browserreiter", () => {
  // Ohne die Kommentare: Die erklaeren, was hier frueher stand — „DileHi",
  // „Vereinsprogramm" — und genau danach wird unten gesucht. Ausgeliefert
  // wird nur das Markup.
  const html = lies("index.html").replace(/<!--[\s\S]*?-->/g, "");

  /**
   * Vor der Anwendung gibt es keine Vereinsdaten, also auch keinen
   * Vereinsnamen. Was dann im Reiter steht, ist der Name des Programms —
   * nicht „Vereinsprogramm", das ist der Name von nichts, und erst recht
   * nicht der Name eines fremden Vereins.
   */
  it("heisst DING und nicht Vereinsprogramm", () => {
    expect(html).toMatch(/<title>\s*DING\s*<\/title>/);
    expect(html).not.toMatch(/Vereinsprogramm/);
  });

  it("sagt dasselbe im geteilten Link", () => {
    expect(html).toMatch(/property="og:title" content="DING"/);
  });

  /**
   * Der Grund, aus dem hier überhaupt etwas Neutrales steht: DileHis Name
   * wurde an jede Installation mit ausgeliefert.
   */
  it("trägt keinen Vereinsnamen", () => {
    expect(html).not.toMatch(/DileHi/i);
  });
});

describe("Die Kachel „Einrichtung“", () => {
  const admin = lies("src/pages/intern/Admin.tsx");

  /**
   * Sie hängt am Stand des Durchlaufs, nicht nur am Recht. Stünde sie im
   * selben Block wie „Erscheinungsbild" und „E-Mail-Vorlagen", wäre sie
   * wieder dauerhaft da.
   */
  it("steht nur, solange die Einrichtung offen ist", () => {
    expect(admin).toMatch(
      /hasPermission\("system\.settings"\) && einrichtungOffen \? \[\s*\{ id: "einrichtung"/
    );
  });

  it("liest denselben Stand wie der Hinweis auf dem Dashboard", () => {
    const dashboard = lies("src/pages/intern/Dashboard.tsx");
    expect(admin).toMatch(/const einrichtungOffen = !useBranding\(\)\.setup_done_at;/);
    expect(dashboard).toMatch(/setup_done_at/);
  });

  /**
   * Weggeräumt ist nicht zugesperrt: Der Inhalt hängt am Reiter, damit
   * `?reiter=einrichtung` den Assistenten weiter öffnet.
   */
  it("bleibt über die Adresse erreichbar", () => {
    expect(admin).toMatch(/activeTab === "einrichtung" && hasPermission\("system\.settings"\)/);
  });
});
