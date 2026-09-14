import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESEBREITE, SEITE, ZWEISPALTIG } from "@/lib/layout";

const seiten = readdirSync("src/pages/intern")
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ name: f, inhalt: readFileSync(`src/pages/intern/${f}`, "utf-8") }));

describe("Seitenbreiten", () => {
  it("kennt genau eine Breite", () => {
    expect(SEITE).toContain("max-w-");
  });

  it("hält lange Fliesstexte trotzdem lesbar", () => {
    // Der Rahmen ist fuer alle gleich, sonst springt er beim Seitenwechsel.
    // Ein Forumsbeitrag ueber die volle Breite waere aber unlesbar, also
    // begrenzt der Text sich selbst.
    const beitrag = readFileSync("src/components/forum/PostBody.tsx", "utf-8");
    expect(beitrag).toContain(LESEBREITE.replace("max-w-", "max-w-"));
    expect(beitrag).not.toContain("max-w-none");
  });

  it("findet die Seiten überhaupt", () => {
    // Schützt vor dem stillen Gegenteil: Wenn der Ordner einmal anders heisst,
    // liefe die Prüfung unten über eine leere Liste und wäre grün.
    expect(seiten.length).toBeGreaterThan(10);
  });

  it("lässt keine Seite ihre eigene Breite erfinden", () => {
    // Vorher hatte jede Seite eine andere: lg, 3xl, 4xl, 5xl, 6xl. Beim Wechsel
    // sprang der Inhalt, und das Profil liess zwei Drittel der Flaeche leer.
    //
    // Ausgenommen sind die schmalen Platzhalter („Lade …", „nicht gefunden"),
    // die mittig auf leerer Seite stehen und keine Inhaltsbreite brauchen.
    const abweichend = seiten.flatMap((s) =>
      [...s.inhalt.matchAll(/className="container [^"]*max-w-[^"]*"/g)]
        .map((m) => `${s.name}: ${m[0]}`)
        .filter((z) => !z.includes("text-center"))
    );
    expect(abweichend).toEqual([]);
  });

  it("benutzt die Breiten aus einer Datei", () => {
    const mitContainer = seiten.filter((s) => s.inhalt.includes("className={SEITE"));
    expect(mitContainer.length).toBeGreaterThan(10);
    for (const s of mitContainer) {
      expect(s.inhalt).toContain('from "@/lib/layout"');
    }
  });
});

describe("Das Profil nutzt die Breite", () => {
  const profil = readFileSync("src/pages/intern/Profile.tsx", "utf-8");

  it("stellt die Kästen ab dem grossen Bildschirm zweispaltig", () => {
    expect(profil).toContain("className={ZWEISPALTIG}");
    expect(ZWEISPALTIG).toContain("lg:columns-2");
    // Ohne das reisst ein Kasten mitten in der Spalte auseinander.
    expect(ZWEISPALTIG).toContain("lg:[&>*]:break-inside-avoid");
  });

  it("beginnt mit den persönlichen Daten und der Mitgliedschaft", () => {
    // Die Reihenfolge im Quelltext ist die Reihenfolge auf dem Handy.
    const reihenfolge = ["Persönliche Daten", "Mitgliedschaft", "Konto"];
    const stellen = reihenfolge.map((t) => profil.indexOf(`>${t}</h2>`));
    expect(stellen.every((i) => i > 0)).toBe(true);
    expect([...stellen].sort((a, b) => a - b)).toEqual(stellen);
  });
});

describe("Zwei Spalten aus Kästen", () => {
  it("geben jedem Kasten Abstand, nicht nur dem ersten", () => {
    // `lg:space-y-0` setzt in Tailwind auch den unteren Rand auf null und
    // gewinnt mit dem längeren Selektor gegen `[&>*]:mb-6`. Dann klebten alle
    // Kästen ab dem zweiten aneinander – im Profil und im Erscheinungsbild.
    expect(ZWEISPALTIG).toContain("lg:[&>*]:mb-6");
    expect(ZWEISPALTIG.split(" ")).not.toContain("lg:space-y-0");

    const erscheinungsbild = readFileSync("src/components/admin/ErscheinungsbildAdmin.tsx", "utf-8");
    expect(erscheinungsbild).toContain("className={ZWEISPALTIG}");
    const selbstGebaut = [...seiten.map((x) => x.inhalt), erscheinungsbild]
      .filter((inhalt) => inhalt.includes("lg:space-y-0 lg:columns-2"));
    expect(selbstGebaut).toEqual([]);
  });
});
