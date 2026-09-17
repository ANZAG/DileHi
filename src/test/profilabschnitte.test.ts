// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { beitragseinzugZeigen, mitgliedsartZeigen } from "@/lib/profilabschnitte";
import type { ModuleState } from "@/hooks/useModule";

/**
 * Das Profil und die abgeschalteten Bereiche.
 *
 * Aus dem Probelauf: Bei einer Interessengemeinschaft ist „Beiträge" ab Werk
 * aus — im Profil stand trotzdem „Beitragseinzug: jährlich/halbjährlich".
 * Ein Feld, das nach etwas fragt, das es nicht gibt, ist schlimmer als
 * keines: Wer es ausfüllt, glaubt, es passiere etwas damit.
 */

/**
 * Ein Modul, wie `module_status()` es liefert.
 *
 * `active` ist das Ergebnis samt Abhängigkeiten – danach richtet sich die
 * Anzeige. `enabled` ist nur der Schalter selbst; wer den prüft, übersieht
 * ein Modul, dessen Voraussetzung fehlt. (Dieser Test hat genau diesen
 * Fehler beim ersten Versuch gefunden – in sich selbst.)
 */
const modul = (key: string, active: boolean): ModuleState =>
  ({ key, active, enabled: active } as ModuleState);

describe("Der Beitragseinzug im Profil", () => {
  it("bleibt weg, solange das Modul aus ist", () => {
    expect(beitragseinzugZeigen([modul("contributions", false)], "fest")).toBe(false);
  });

  it("bleibt auch weg, wenn gar kein Beitrag erhoben wird", () => {
    // Ohne Beitrag gibt es nichts einzuziehen – die Frage nach dem Rhythmus
    // wäre eine Fangfrage.
    expect(beitragseinzugZeigen([modul("contributions", true)], "keiner")).toBe(false);
  });

  it("erscheint, wo Beiträge erhoben werden", () => {
    expect(beitragseinzugZeigen([modul("contributions", true)], "fest")).toBe(true);
    expect(beitragseinzugZeigen([modul("contributions", true)], "umlage")).toBe(true);
  });
});

describe("Die Art der Mitgliedschaft", () => {
  it("erscheint nur, wo es etwas zu wählen gibt", () => {
    expect(mitgliedsartZeigen(0)).toBe(false);
    expect(mitgliedsartZeigen(1)).toBe(false);
    expect(mitgliedsartZeigen(2)).toBe(true);
  });
});

describe("Die Maske fragt auch wirklich", () => {
  const profil = readFileSync("src/pages/intern/Profile.tsx", "utf-8");

  it("hängt beide Felder an diese Entscheidung", () => {
    // Sonst stehen die Funktionen da und niemand ruft sie auf – genau der
    // Zustand, aus dem der Fehler kam.
    expect(profil).toContain("beitragseinzugZeigen(module, modell)");
    expect(profil).toContain("mitgliedsartZeigen(mitgliedsarten.length)");

    // Und das Feld steht hinter seiner Bedingung, nicht daneben.
    const bedingung = profil.indexOf("{beitraegeAn && (");
    const feld = profil.indexOf("Beitragseinzug<Hilfe");
    expect(bedingung).toBeGreaterThan(0);
    expect(feld).toBeGreaterThan(bedingung);
  });

  it("nennt die Mitgliedschaft so, wie die Organisation sie nennt", () => {
    expect(profil).toContain("{woerter.mitgliedschaft}");
    expect(profil).toContain("{woerter.mitgliedsart}");
    // „Wird vom Vorstand eingetragen" gilt nicht für eine IG.
    expect(profil).not.toContain("vom Vorstand eingetragen");
  });
});
