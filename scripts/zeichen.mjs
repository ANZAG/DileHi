/**
 * Das Zeichen einer Installation, die noch keines hat.
 *
 * Bis zum Probelauf lagen in public/ DileHis Wappen: favicon.ico,
 * apple-touch-icon.png und die drei Symbole des Manifests. Im Browserreiter
 * eines fremden Vereins stand damit unser Zeichen — und auf dem
 * Startbildschirm, wer die Seite dort ablegte, ebenfalls. Eine SVG-Datei
 * allein reicht nicht: Jeder Browser fragt von sich aus nach /favicon.ico,
 * und iOS nimmt apple-touch-icon.png.
 *
 * Dieses Skript zeichnet dieselbe Form wie public/favicon.svg als PNG — drei
 * Figuren um einen Tisch, in Grau. Kein Fremdwerkzeug: Es gibt hier weder
 * ImageMagick noch einen SVG-Wandler, und eine Abhängigkeit, die nur einmal
 * im Jahr läuft, ist eine Abhängigkeit zu viel. Gezeichnet wird von Hand in
 * ein Feld aus Bildpunkten, vierfach überabgetastet gegen ausgefranste
 * Kanten, und mit pngjs verpackt.
 *
 *   node scripts/zeichen.mjs
 *
 * Die Ergebnisse liegen im Verzeichnis und sind eingecheckt; das Skript ist
 * die Erklärung, wie sie entstanden sind, und der Weg, sie zu ändern.
 */

import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const DUNKEL = [28, 25, 23];      // #1c1917, wie im SVG
const HELL = [244, 242, 238];     // #f4f2ee

/** Die Form, in Einheiten von 64 – dieselben Zahlen wie in favicon.svg. */
function deckung(x, y) {
  // Rückgabe: wie viel Helligkeit an dieser Stelle liegt (0 … 1).
  const kreis = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

  if (kreis(32, 24, 7)) return 1;
  if (kreis(17, 38, 5.5) || kreis(47, 38, 5.5)) return 0.75;
  // Der Tisch: eine halbe Ellipse auf der Grundlinie y = 52.
  if (y <= 52 && ((x - 32) / 20) ** 2 + ((y - 52) / 11) ** 2 <= 1) return 0.55;
  return 0;
}

/** Liegt der Punkt in der abgerundeten Fläche? (Radius in Einheiten von 64.) */
function imGrund(x, y, radius) {
  if (radius <= 0) return true;
  const r = radius;
  const nx = Math.min(Math.max(x, r), 64 - r);
  const ny = Math.min(Math.max(y, r), 64 - r);
  return (x - nx) ** 2 + (y - ny) ** 2 <= r * r;
}

/**
 * @param groesse  Kantenlänge in Bildpunkten
 * @param radius   Eckenrundung in Einheiten von 64 (0 = eckig)
 * @param anteil   Wie viel der Fläche die Figur einnimmt (Sicherheitszone)
 */
function zeichnen(groesse, { radius = 14, anteil = 1 } = {}) {
  const png = new PNG({ width: groesse, height: groesse });
  const ABTASTUNG = 4;
  const rand = ((1 - anteil) / 2) * 64;

  for (let py = 0; py < groesse; py++) {
    for (let px = 0; px < groesse; px++) {
      let grund = 0;
      let figur = 0;
      for (let sy = 0; sy < ABTASTUNG; sy++) {
        for (let sx = 0; sx < ABTASTUNG; sx++) {
          const x = ((px + (sx + 0.5) / ABTASTUNG) / groesse) * 64;
          const y = ((py + (sy + 0.5) / ABTASTUNG) / groesse) * 64;
          if (!imGrund(x, y, radius)) continue;
          grund += 1;
          // Die Figur sitzt mittig und kleiner, wenn eine Sicherheitszone
          // verlangt ist (Android schneidet maskierbare Symbole rund zu).
          figur += deckung((x - rand) / anteil, (y - rand) / anteil);
        }
      }
      const felder = ABTASTUNG * ABTASTUNG;
      const alpha = grund / felder;
      const mischung = grund > 0 ? figur / grund : 0;
      const i = (py * groesse + px) * 4;
      for (let k = 0; k < 3; k++) {
        png.data[i + k] = Math.round(DUNKEL[k] + (HELL[k] - DUNKEL[k]) * mischung);
      }
      png.data[i + 3] = Math.round(alpha * 255);
    }
  }
  return PNG.sync.write(png);
}

/**
 * Ein ICO mit PNG-Inhalt.
 *
 * Seit Vista darf in einer .ico ein PNG stehen; jeder Browser, der heute noch
 * gebaut wird, kann das. Der Kopf ist schnell geschrieben, und die Alternative
 * wäre ein Paket, das Bilder umwandelt.
 */
function ico(bilder) {
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(0, 0);
  kopf.writeUInt16LE(1, 2); // 1 = Symbol
  kopf.writeUInt16LE(bilder.length, 4);

  let versatz = 6 + bilder.length * 16;
  const eintraege = bilder.map(({ groesse, daten }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(groesse >= 256 ? 0 : groesse, 0);
    e.writeUInt8(groesse >= 256 ? 0 : groesse, 1);
    e.writeUInt8(0, 2); // Farben in der Palette: keine
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // Ebenen
    e.writeUInt16LE(32, 6); // Bits je Punkt
    e.writeUInt32LE(daten.length, 8);
    e.writeUInt32LE(versatz, 12);
    versatz += daten.length;
    return e;
  });

  return Buffer.concat([kopf, ...eintraege, ...bilder.map((b) => b.daten)]);
}

const dateien = [
  // Im Reiter und in der Lesezeichenleiste.
  ["public/icon-192.png", zeichnen(192)],
  ["public/icon-512.png", zeichnen(512)],
  // Android schneidet maskierbare Symbole rund zu: Die Figur muss in den
  // inneren 80 Prozent liegen, der Grund geht bis an den Rand.
  ["public/icon-maskable-512.png", zeichnen(512, { radius: 0, anteil: 0.72 })],
  // iOS rundet selbst ab und mag keine Durchsichtigkeit.
  ["public/apple-touch-icon.png", zeichnen(180, { radius: 0 })],
];

for (const [pfad, daten] of dateien) {
  writeFileSync(pfad, daten);
  console.log(`${pfad}: ${daten.length} Bytes`);
}

const icoDatei = ico([16, 32, 48].map((groesse) => ({ groesse, daten: zeichnen(groesse, { radius: 10 }) })));
writeFileSync("public/favicon.ico", icoDatei);
console.log(`public/favicon.ico: ${icoDatei.length} Bytes`);
