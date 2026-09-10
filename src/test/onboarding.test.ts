import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHRITTE, passendeSchritte, GRUPPEN } from "@/components/onboarding/schritte";

describe("Erste Schritte", () => {
  it("hat eindeutige Schlüssel", () => {
    // Zwei gleiche Schlüssel hiessen: Der zweite Schritt gilt als gesehen,
    // sobald jemand den ersten weggeklickt hat.
    const keys = SCHRITTE.map((s) => s.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it("kennt jede benutzte Gruppe", () => {
    for (const s of SCHRITTE) expect(GRUPPEN[s.gruppe]).toBeTruthy();
  });

  it("zeigt einem einfachen Mitglied nichts aus der Verwaltung", () => {
    const tour = passendeSchritte(() => false, () => true);
    expect(tour.every((s) => !s.recht)).toBe(true);
    expect(tour.map((s) => s.key)).toContain("profil");
  });

  it("lässt Schritte abgeschalteter Module weg", () => {
    const ohneForum = passendeSchritte(() => true, (m) => m !== "forum");
    expect(ohneForum.map((s) => s.key)).not.toContain("forum");
    expect(ohneForum.map((s) => s.key)).toContain("profil");
  });

  it("zeigt einem Verein ohne Module und ohne Rechte trotzdem einen Anfang", () => {
    // Der Extremfall: frische Installation, alles aus. Eine leere Tour wäre
    // ein leeres Fenster.
    const minimal = passendeSchritte(() => false, () => false);
    expect(minimal.length).toBeGreaterThan(0);
  });
});

/**
 * Die Verkabelung.
 *
 * Ein Schritt mit einem Recht oder Modul, das es nicht gibt, ist unsichtbar –
 * und niemand merkt es. Genau deshalb steht das hier.
 */
describe("Verkabelung der Schritte", () => {
  const migrationen = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(`supabase/migrations/${f}`, "utf-8"))
    .join("\n");

  const quellen = ["src/pages/intern/Admin.tsx", "src/pages/intern/Dashboard.tsx", "src/App.tsx"]
    .map((f) => readFileSync(f, "utf-8"))
    .join("\n");

  it("benutzt nur Rechte, die es auch anderswo gibt", () => {
    const rechte = [...new Set(SCHRITTE.map((s) => s.recht).filter(Boolean))] as string[];
    expect(rechte.length).toBeGreaterThan(5);
    const fehlend = rechte.filter(
      (r) => !quellen.includes(`"${r}"`) && !migrationen.includes(`'${r}'`)
    );
    expect(fehlend).toEqual([]);
  });

  it("benutzt nur Module, die die Datenbank kennt", () => {
    const module = [...new Set(SCHRITTE.map((s) => s.modul).filter(Boolean))] as string[];
    expect(module.length).toBeGreaterThan(5);
    const fehlend = module.filter((m) => !migrationen.includes(`'${m}'`));
    expect(fehlend).toEqual([]);
  });

  it("trägt in der Migration nur Schlüssel nach, die es gibt", () => {
    // Die Migration markiert alte Touren als gesehen. Ein Tippfehler dort
    // hiesse: Der Schritt gilt weiter als offen und wird allen noch einmal
    // gezeigt, obwohl sie ihn kennen.
    const sql = readFileSync(
      "supabase/migrations/20260909240000_erste_schritte.sql",
      "utf-8"
    );
    const bekannt = new Set(SCHRITTE.map((s) => s.key));
    const nachgetragen = [...sql.matchAll(/'([a-z_]+)'/g)]
      .map((m) => m[1])
      .filter((k) => !["member", "vorstand", "schatzmeister", "herold"].includes(k));
    const unbekannt = [...new Set(nachgetragen)].filter((k) => !bekannt.has(k));
    expect(unbekannt).toEqual([]);
  });
});

/**
 * Overlay und Liste zeigen dasselbe an – also fragen sie auch dasselbe.
 *
 * Zwei Umsetzungen derselben Sache, die auseinanderlaufen, hatten wir in
 * diesem Projekt schon mehrfach. Hier waere die Folge: Der Kasten auf der
 * Startseite zeigt einen Schritt als offen, den die Tour laengst abgehakt hat.
 */
describe("Eine Quelle für beide Ansichten", () => {
  const dateien = [
    "src/components/onboarding/OnboardingTour.tsx",
    "src/components/onboarding/ErsteSchritte.tsx",
  ];

  it("holt den Stand nur über useTour", () => {
    for (const datei of dateien) {
      const inhalt = readFileSync(datei, "utf-8");
      expect(inhalt).toContain('from "./useTour"');
      expect(inhalt).not.toContain('from("user_tours")');
    }
  });
});
