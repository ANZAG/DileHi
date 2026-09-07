import { describe, expect, it } from "vitest";
import { layoutCamp, DEFAULT_LAYOUT_PROFILE } from "@/components/evaluation/campLayout";
import type { TentItem } from "@/components/evaluation/TentVisualizer";

// Die Anordnung war vorher im Code behauptet, aber nicht umgesetzt: Das
// Gruppenzelt wurde gegen die Hoehe der Kuechenspalte zentriert statt gegen den
// Platz und landete bei rund einem Viertel der Breite. Diese Tests halten die
// Regeln fest.

const tent = (id: string, category: string, w: number, h: number): TentItem =>
  ({ id, label: id, typeName: "", area: w * h, w, h, innerW: w, innerH: h,
     guyRope: 0, shape: "rect", category, x: 0, y: 0 }) as TentItem;

const camp = () => [
  tent("kueche", "kitchen", 8, 5),
  tent("versorgung", "supply", 6, 4),
  tent("gruppenzelt", "group_tent", 11, 11),
  ...Array.from({ length: 10 }, (_, i) => tent(`zelt${i}`, "member", 5, 5)),
];

const byId = (items: TentItem[], id: string) => items.find((i) => i.id === id)!;
const overlap = (a: TentItem, b: TentItem) =>
  a.x < b.x + b.w - 0.001 && a.x + a.w > b.x + 0.001 &&
  a.y < b.y + b.h - 0.001 && a.y + a.h > b.y + 0.001;

describe("layoutCamp", () => {
  it("stellt die Küche an die linke Kante, vorne", () => {
    const items = camp();
    layoutCamp(items);
    const kueche = byId(items, "kueche");
    expect(kueche.x).toBe(0);
    expect(kueche.y).toBe(0);
  });

  it("stellt die Versorgung direkt unter die Küche", () => {
    const items = camp();
    layoutCamp(items);
    const kueche = byId(items, "kueche");
    const versorgung = byId(items, "versorgung");
    expect(versorgung.x).toBe(0);
    expect(versorgung.y).toBe(kueche.y + kueche.h);
  });

  it("stellt das Gruppenzelt vorne an den Weg", () => {
    // Nur die X-Achse wird zentriert – in der Y-Achse steht es vorne.
    const items = camp();
    layoutCamp(items);
    expect(byId(items, "gruppenzelt").y).toBe(0);
  });

  it("zentriert das Gruppenzelt waagerecht im Platz", () => {
    const items = camp();
    layoutCamp(items);
    const gz = byId(items, "gruppenzelt");
    const maxX = Math.max(...items.map((i) => i.x + i.w));
    const mitteZelt = gz.x + gz.w / 2;
    const mittePlatz = maxX / 2;
    // Grosszuegige Schranke: Es muss ersichtlich mittig liegen, nicht exakt.
    expect(Math.abs(mitteZelt - mittePlatz)).toBeLessThan(maxX * 0.2);
  });

  it("hält das Gruppenzelt aus der Küchenspalte heraus", () => {
    const items = camp();
    layoutCamp(items);
    expect(byId(items, "gruppenzelt").x).toBeGreaterThanOrEqual(byId(items, "kueche").w);
  });

  it("stellt kein Zelt auf ein anderes", () => {
    const items = camp();
    layoutCamp(items);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        expect(overlap(items[i], items[j]), `${items[i].id} überlappt ${items[j].id}`).toBe(false);
      }
    }
  });

  it("legt die Schlafzelte um das Gruppenzelt herum, nicht in eine Reihe dahinter", () => {
    const items = camp();
    layoutCamp(items);
    const gz = byId(items, "gruppenzelt");
    const member = items.filter((i) => i.category === "member");
    // Ringsum heisst: Es liegen Zelte links und rechts der Gruppenzeltmitte.
    const mitte = gz.x + gz.w / 2;
    expect(member.some((m) => m.x + m.w / 2 < mitte)).toBe(true);
    expect(member.some((m) => m.x + m.w / 2 > mitte)).toBe(true);
  });

  it("kommt ohne Gruppenzelt und ohne Küche aus", () => {
    const items = Array.from({ length: 4 }, (_, i) => tent(`z${i}`, "member", 4, 4));
    expect(() => layoutCamp(items)).not.toThrow();
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++)
        expect(overlap(items[i], items[j])).toBe(false);
  });

  it("lässt sich über ein anderes Profil umstellen", () => {
    // Fuer die eigenstaendige Fassung: andere Vereine, andere Aufstellung.
    const items = camp();
    layoutCamp(items, {
      ...DEFAULT_LAYOUT_PROFILE,
      zones: { ...DEFAULT_LAYOUT_PROFILE.zones, group_tent: "left-front", kitchen: "around" },
    });
    expect(byId(items, "gruppenzelt").x).toBe(0);
  });

  it("verkraftet ein leeres Lager", () => {
    expect(() => layoutCamp([])).not.toThrow();
  });
});
