// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

/**
 * Warum die Kategorie-Knöpfe hängen blieben.
 *
 * Aus dem Probelauf: Wer unter „Kategorien" etwas anlegte oder umbenannte,
 * sah in Galerie, Quellen und Besucher-Highlights weiter die alten Knöpfe —
 * bis er die ganze Seite neu lud.
 *
 * Der Grund waren zwei Zwischenspeicher übereinander: der Merker in
 * auswahl.ts (60 Sekunden, damit der Seiteneditor nicht bei jedem Tastendruck
 * fragt) und die Abfrage in useKategorien (fünf Minuten). Die Verwaltung
 * leerte den ersten und frischte ihre eigene Liste auf — von der zweiten
 * wusste sie nichts.
 *
 * Geprüft wird deshalb beides, und zwar so, wie es schiefging.
 */

const zeilen: { wert: { key: string; label: string }[] } = { wert: [] };
let abfragen = 0;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => {
          abfragen += 1;
          return Promise.resolve({ data: zeilen.wert, error: null });
        },
      }),
    }),
  },
}));

const { kategorieAuswahl } = await import("@/components/sitebuilder/auswahl");
const { kategorienAktualisieren, KATEGORIEN_SCHLUESSEL } = await import("@/hooks/useKategorien");

beforeEach(() => {
  abfragen = 0;
  zeilen.wert = [{ key: "lagerleben", label: "Lagerleben" }];
});

describe("Kategorien auffrischen", () => {
  it("leert den Merker, aus dem der Seiteneditor liest", async () => {
    const qc = new QueryClient();
    kategorienAktualisieren(qc); // sauber anfangen

    expect((await kategorieAuswahl())[0].label).toBe("Lagerleben");
    // Zweiter Aufruf: aus dem Merker, ohne neue Abfrage.
    await kategorieAuswahl();
    expect(abfragen).toBe(1);

    // Jemand benennt um.
    zeilen.wert = [{ key: "lagerleben", label: "Lager und Leben" }];
    expect((await kategorieAuswahl())[0].label, "noch aus dem Merker").toBe("Lagerleben");

    kategorienAktualisieren(qc);
    expect((await kategorieAuswahl())[0].label).toBe("Lager und Leben");
    expect(abfragen).toBe(2);
  });

  it("frischt die Abfrage auf, aus der die Knöpfe kommen", () => {
    const qc = new QueryClient();
    qc.setQueryData([...KATEGORIEN_SCHLUESSEL], [{ value: "alt", label: "Alt" }]);
    expect(qc.getQueryState([...KATEGORIEN_SCHLUESSEL])?.isInvalidated).toBe(false);

    kategorienAktualisieren(qc);

    // Genau das fehlte: Die Verwaltung kannte diesen Schlüssel nicht.
    expect(
      qc.getQueryState([...KATEGORIEN_SCHLUESSEL])?.isInvalidated,
      "Die Knöpfe in Galerie, Quellen und Highlights bleiben sonst stehen"
    ).toBe(true);
  });

  it("frischt auch die Liste in der Verwaltung auf", () => {
    const qc = new QueryClient();
    qc.setQueryData(["site-categories"], []);
    kategorienAktualisieren(qc);
    expect(qc.getQueryState(["site-categories"])?.isInvalidated).toBe(true);
  });

  it("wird von der Kategorienverwaltung auch benutzt", async () => {
    // Sonst steht die Stelle da und niemand ruft sie auf – genau der Zustand,
    // aus dem der Fehler kam.
    const { readFileSync } = await import("node:fs");
    const code = readFileSync("src/components/admin/KategorienAdmin.tsx", "utf-8");
    expect(code).toContain("kategorienAktualisieren");
  });
});
