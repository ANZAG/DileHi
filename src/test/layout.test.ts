import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEITE, SEITE_LESEN, SEITE_WEIT } from "@/lib/layout";

const seiten = readdirSync("src/pages/intern")
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ name: f, inhalt: readFileSync(`src/pages/intern/${f}`, "utf-8") }));

describe("Seitenbreiten", () => {
  it("kennt drei Breiten und keine vierte", () => {
    expect([SEITE, SEITE_WEIT, SEITE_LESEN].every((k) => k.includes("max-w-"))).toBe(true);
    expect(new Set([SEITE, SEITE_WEIT, SEITE_LESEN]).size).toBe(3);
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
    expect(profil).toContain("lg:columns-2");
    // Ohne das reisst ein Kasten mitten in der Spalte auseinander.
    expect(profil).toContain("lg:[&>*]:break-inside-avoid");
  });

  it("beginnt mit den persönlichen Daten und der Mitgliedschaft", () => {
    // Die Reihenfolge im Quelltext ist die Reihenfolge auf dem Handy.
    const reihenfolge = ["Persönliche Daten", "Mitgliedschaft", "Konto"];
    const stellen = reihenfolge.map((t) => profil.indexOf(`>${t}</h2>`));
    expect(stellen.every((i) => i > 0)).toBe(true);
    expect([...stellen].sort((a, b) => a - b)).toEqual(stellen);
  });
});
