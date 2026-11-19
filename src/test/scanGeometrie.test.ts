// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  abbilden, amBundTeilen, bundTeile, entzerren, homographie, inPixel, kontrastStrecken, seiteAbtasten, seitenrahmen,
  viereckDrehen, zielGroesse, type Gitter, type Pixel, type Viereck,
} from "@/lib/scan/geometrie";
import { Ausloeser, unterschied } from "@/lib/scan/ausloeser";

/**
 * Der Scanner zieht ein schräg fotografiertes Buch gerade und teilt
 * Doppelseiten. Was nicht passieren darf: dass Ecken vertauscht werden
 * (dann steht die Seite auf dem Kopf oder gespiegelt) und dass der Auslöser
 * mitten im Umblättern ein Foto macht.
 */

function bild(breite: number, hoehe: number, farbe: (x: number, y: number) => number): Pixel {
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const v = farbe(x, y);
      const i = (y * breite + x) * 4;
      daten[i] = daten[i + 1] = daten[i + 2] = v;
      daten[i + 3] = 255;
    }
  }
  return { breite, hoehe, daten };
}
const grau = (b: Pixel, x: number, y: number) => b.daten[(y * b.breite + x) * 4];

describe("Projektion", () => {
  it("bildet die vier Ecken genau aufeinander ab", () => {
    const von: Viereck = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];
    const nach: Viereck = [{ x: 12, y: 7 }, { x: 180, y: 20 }, { x: 170, y: 140 }, { x: 5, y: 120 }];
    const h = homographie(von, nach);
    von.forEach((p, i) => {
      const q = abbilden(h, p);
      expect(q.x).toBeCloseTo(nach[i].x, 6);
      expect(q.y).toBeCloseTo(nach[i].y, 6);
    });
  });

  it("verweigert ein Viereck, das zur Linie zusammengefallen ist", () => {
    const linie: Viereck = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    expect(() => homographie(linie, linie)).toThrow(/Linie/);
  });

  it("nimmt die längeren Kanten als Grösse", () => {
    expect(zielGroesse([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 90, y: 60 }, { x: 10, y: 50 }])).toEqual({ breite: 100, hoehe: 61 }) // rechte Kante: √(10² + 60²);
  });
});

describe("Entzerren", () => {
  // Links dunkel, rechts hell, oben eine dunkle Zeile: Daran sieht man, ob
  // etwas gespiegelt oder gedreht wurde.
  const vorlage = bild(200, 100, (x, y) => (y < 10 ? 0 : x < 100 ? 60 : 220));

  it("lässt ein Bild mit dem ganzen Rahmen, wie es ist", () => {
    const v = inPixel([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], 199, 99);
    const aus = entzerren(vorlage, v);
    expect(aus.breite).toBe(199);
    expect(grau(aus, 5, 50)).toBe(60);
    expect(grau(aus, 190, 50)).toBe(220);
    expect(grau(aus, 100, 2)).toBe(0);
  });

  it("schneidet ein Viereck heraus, ohne zu spiegeln", () => {
    const v: Viereck = [{ x: 50, y: 20 }, { x: 150, y: 20 }, { x: 150, y: 90 }, { x: 50, y: 90 }];
    const aus = entzerren(vorlage, v);
    expect(aus.breite).toBe(100);
    expect(grau(aus, 10, 30)).toBe(60);
    expect(grau(aus, 90, 30)).toBe(220);
  });

  it("streckt den Kontrast: grau auf vergilbt wird schwarz auf weiss", () => {
    const blass = bild(100, 100, (x) => (x < 20 ? 90 : 200));
    kontrastStrecken(blass);
    expect(grau(blass, 5, 5)).toBe(0);
    expect(grau(blass, 50, 5)).toBe(255);
  });

  it("teilt eine Doppelseite am Bund in links und rechts", () => {
    const [links, rechts] = amBundTeilen(vorlage, 0.5);
    expect(links.breite + rechts.breite).toBe(200);
    expect(grau(links, 50, 50)).toBe(60);
    expect(grau(rechts, 50, 50)).toBe(220);
  });
});

describe("Auslöser", () => {
  it("löst die erste Seite aus, sobald das Bild ruhig steht", () => {
    const a = new Ausloeser({ bewegt: 12, ruhig: 4, ruhezeit: 500 });
    expect(a.melden(1, 0)).toBe(false);
    expect(a.melden(1, 400)).toBe(false);
    expect(a.melden(1, 500)).toBe(true);
  });

  it("wartet danach auf das Umblättern und löst nicht zweimal dieselbe Seite aus", () => {
    const a = new Ausloeser({ bewegt: 12, ruhig: 4, ruhezeit: 500 });
    a.melden(1, 0);
    expect(a.melden(1, 600)).toBe(true);
    expect(a.melden(1, 5000)).toBe(false);
    expect(a.melden(30, 5100)).toBe(false); // Hand im Bild
    expect(a.melden(2, 5200)).toBe(false);
    expect(a.melden(2, 5600)).toBe(false);
    expect(a.melden(2, 5700)).toBe(true);
  });

  it("fängt die Ruhezeit neu an, wenn es zwischendurch wackelt", () => {
    const a = new Ausloeser({ bewegt: 12, ruhig: 4, ruhezeit: 500 });
    a.melden(1, 0);
    expect(a.melden(8, 300)).toBe(false);
    expect(a.melden(1, 400)).toBe(false);
    expect(a.melden(1, 800)).toBe(false);
    expect(a.melden(1, 900)).toBe(true);
  });

  it("misst die Abweichung zweier Bilder", () => {
    expect(unterschied(new Uint8ClampedArray([10, 10]), new Uint8ClampedArray([20, 0]))).toBe(10);
    expect(unterschied(new Uint8ClampedArray(2), new Uint8ClampedArray(3))).toBe(255);
  });
});

describe("Abtasten mit Gitter (Glätten)", () => {
  const vorlage = bild(120, 80, (x, y) => (x * 2 + y) % 256);
  const rahmen = seitenrahmen([{ x: 0, y: 0 }, { x: 119, y: 0 }, { x: 119, y: 79 }, { x: 0, y: 79 }]);

  /** Ein Gitter, das jeden Punkt auf sich selbst abbildet. */
  function gitter(spalten: number, zeilen: number, verschieben = 0): Gitter {
    const daten = new Float32Array(2 * spalten * zeilen);
    for (let z = 0; z < zeilen; z++) {
      for (let s = 0; s < spalten; s++) {
        daten[z * spalten + s] = (s / (spalten - 1)) * 2 - 1 + verschieben;
        daten[spalten * zeilen + z * spalten + s] = (z / (zeilen - 1)) * 2 - 1;
      }
    }
    return { spalten, zeilen, daten };
  }

  it("ändert mit einem Gitter, das nichts verschiebt, nichts", () => {
    const ohne = seiteAbtasten(vorlage, rahmen);
    const mit = seiteAbtasten(vorlage, rahmen, { gitter: gitter(31, 45) });
    let abweichung = 0;
    for (let i = 0; i < ohne.daten.length; i++) abweichung = Math.max(abweichung, Math.abs(ohne.daten[i] - mit.daten[i]));
    expect(abweichung).toBeLessThanOrEqual(1);
  });

  it("folgt dem Gitter: nach rechts verschoben heisst, weiter rechts abgetastet", () => {
    const mit = seiteAbtasten(vorlage, rahmen, { gitter: gitter(31, 45, 0.5) }); // ein Viertel der Breite
    expect(Math.abs(grau(mit, 10, 20) - grau(vorlage, 40, 20))).toBeLessThanOrEqual(2);
  });

  it("nimmt bei einer Doppelseite nur die Hälfte, ohne sie zu spiegeln", () => {
    const [[x0, b0], [x1, b1]] = bundTeile(rahmen.breite, 0.5);
    // Die Seite ist 119 Punkte breit (Abstand der Ecken), also 60 + 59.
    expect([x0, b0, x1, b1]).toEqual([0, 60, 60, 59]);
    const rechts = seiteAbtasten(vorlage, rahmen, { x0: x1, breite: b1 });
    expect(rechts.breite).toBe(59);
    // Grauwert steigt um 2 je Punkt nach rechts: Links in der rechten Hälfte
    // steht, was in der Mitte der Vorlage stand, rechts deren rechter Rand.
    expect(Math.abs(grau(rechts, 0, 10) - grau(vorlage, 60, 10))).toBeLessThanOrEqual(3);
    expect(Math.abs(grau(rechts, 58, 10) - grau(vorlage, 119, 10))).toBeLessThanOrEqual(3);
  });

  it("verkleinert für das Netz auf eine feste Grösse", () => {
    const klein = seiteAbtasten(vorlage, rahmen, { ausBreite: 31, ausHoehe: 45, farbig: true });
    expect([klein.breite, klein.hoehe]).toEqual([31, 45]);
    expect(grau(klein, 0, 0)).toBe(grau(vorlage, 0, 0));
  });
});

describe("Rahmen mitdrehen", () => {
  const v: Viereck = [{ x: 0.1, y: 0.2 }, { x: 0.6, y: 0.2 }, { x: 0.6, y: 0.9 }, { x: 0.1, y: 0.9 }];

  it("dreht mit dem Bild im Uhrzeigersinn; die erste Ecke bleibt oben links", () => {
    // Was links unten war, liegt nach 90° im Uhrzeigersinn links oben.
    const erwartet = [{ x: 0.1, y: 0.1 }, { x: 0.8, y: 0.1 }, { x: 0.8, y: 0.6 }, { x: 0.1, y: 0.6 }];
    viereckDrehen(v).forEach((p, i) => { expect(p.x).toBeCloseTo(erwartet[i].x); expect(p.y).toBeCloseTo(erwartet[i].y); });
  });

  it("kommt nach vier Drehungen zurück", () => {
    const r = viereckDrehen(viereckDrehen(viereckDrehen(viereckDrehen(v))));
    r.forEach((p, i) => { expect(p.x).toBeCloseTo(v[i].x); expect(p.y).toBeCloseTo(v[i].y); });
  });
});
