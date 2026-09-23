import { describe, it, expect } from "vitest";
import { puckConfig } from "@/components/sitebuilder/puckConfig";
import { BAUSTEIN_KATALOG } from "@/components/sitebuilder/bausteinKatalog";

/**
 * Jeder Baustein erklärt sich in der Leiste selbst – und steht in einer
 * Gruppe. Ein neuer Baustein ohne Eintrag fiele sonst wieder auf den blossen
 * Namen zurück und landete ohne Gruppe ganz unten.
 */
describe("Bausteinkatalog", () => {
  const namen = Object.keys(puckConfig.components);
  const gruppiert = Object.values(puckConfig.categories ?? {}).flatMap((k) => k.components ?? []);

  it("hat zu jedem Baustein Satz und Skizze", () => {
    for (const n of namen) {
      expect(BAUSTEIN_KATALOG[n]?.kurz, n).toBeTruthy();
      expect(BAUSTEIN_KATALOG[n]?.skizze.length, n).toBeGreaterThan(0);
    }
  });

  it("ordnet jeden Baustein genau einer Gruppe zu", () => {
    for (const n of namen) expect(gruppiert.filter((g) => g === n).length, n).toBe(1);
    for (const g of gruppiert) expect(namen, g).toContain(g);
  });

  it("hält die Skizzen in ihrer Fläche", () => {
    for (const [n, e] of Object.entries(BAUSTEIN_KATALOG)) {
      for (const [, x, y, w, h] of e.skizze) {
        expect(x >= 0 && y >= 0 && x + w <= 120 && y + h <= 72, `${n}: ${x},${y},${w},${h}`).toBe(true);
      }
    }
  });
});
