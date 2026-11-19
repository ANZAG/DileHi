import type { Pixel } from "./geometrie";

/**
 * Finger am Seitenrand entfernen.
 *
 * Wer ein Buch offen hält, hat Daumen auf dem Rand. Die erkennt man an der
 * Farbe: Haut hat deutlich mehr Rot als Papier, auch vergilbtes. Gemessen an
 * Probefotos (YCbCr): Papier und Tisch Cr 127–133, ein Daumen im Schatten
 * 146–149. Die Grenze liegt bei 140.
 *
 * Damit eine rötliche Abbildung nicht verschwindet, gilt nur als Finger, was
 *   - in einem Streifen am Rand liegt (dort, wo man ein Buch hält) und
 *   - vom Bildrand her zusammenhängend hereinragt.
 * Gefüllt wird mit der Papierfarbe des Randes. Danach entfernen Graustufen
 * und Kontrast den Rest.
 *
 * Gearbeitet wird auf einem groben Raster (etwa 400 Felder breit) – Finger
 * sind gross, und so bleibt es auch bei 4K schnell.
 */

export interface FingerErgebnis {
  /** Anteil der Fläche, die gefüllt wurde (0…1). */
  anteil: number;
}

const RAND_SEITE = 0.14;
const RAND_OBEN_UNTEN = 0.1;
/** Kleinere Flecken sind kein Finger, sondern Rauschen oder ein roter Buchstabe. */
const MINDEST_ANTEIL = 0.0015;

export function istHaut(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
  const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
  return cr >= 140 && cr <= 185 && cb >= 80 && cb <= 135 && y >= 30 && r > g;
}

/** Ändert das Bild (RGBA) selbst. */
export function fingerEntfernen(bild: Pixel): FingerErgebnis {
  const { breite: w, hoehe: h, daten: d } = bild;
  const schritt = Math.max(1, Math.round(Math.max(w, h) / 400));
  const gw = Math.ceil(w / schritt);
  const gh = Math.ceil(h / schritt);
  const randX = Math.round(gw * RAND_SEITE);
  const randY = Math.round(gh * RAND_OBEN_UNTEN);
  const imRand = (x: number, y: number) => x < randX || x >= gw - randX || y < randY || y >= gh - randY;

  // Raster: Ist das Feld Haut? (Mitte des Feldes genügt.)
  const haut = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const py = Math.min(h - 1, y * schritt + (schritt >> 1));
    for (let x = 0; x < gw; x++) {
      if (!imRand(x, y)) continue;
      const px = Math.min(w - 1, x * schritt + (schritt >> 1));
      const i = (py * w + px) * 4;
      if (istHaut(d[i], d[i + 1], d[i + 2])) haut[y * gw + x] = 1;
    }
  }

  // Vom Bildrand her zusammenhängende Hautflächen – das sind die Finger.
  const finger = new Uint8Array(gw * gh);
  const warteschlange: number[] = [];
  const anfang = (x: number, y: number) => {
    const k = y * gw + x;
    if (haut[k] && !finger[k]) { finger[k] = 1; warteschlange.push(k); }
  };
  for (let x = 0; x < gw; x++) { anfang(x, 0); anfang(x, gh - 1); }
  for (let y = 0; y < gh; y++) { anfang(0, y); anfang(gw - 1, y); }
  while (warteschlange.length) {
    const k = warteschlange.pop()!;
    const x = k % gw;
    const y = (k - x) / gw;
    if (x > 0) anfang(x - 1, y);
    if (x < gw - 1) anfang(x + 1, y);
    if (y > 0) anfang(x, y - 1);
    if (y < gh - 1) anfang(x, y + 1);
  }

  let zahl = 0;
  for (let k = 0; k < finger.length; k++) zahl += finger[k];
  if (zahl < gw * gh * MINDEST_ANTEIL) return { anteil: 0 };

  // Etwas grösser machen: Der Rand eines Fingers ist dunkler und nicht mehr
  // eindeutig Haut (Schatten).
  const maske = new Uint8Array(gw * gh);
  const R = 2;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!finger[y * gw + x]) continue;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) maske[ny * gw + nx] = 1;
        }
      }
    }
  }

  // Papierfarbe: der Median der hellen Randfelder, die kein Finger sind.
  const proben: [number, number, number][] = [];
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!imRand(x, y) || maske[y * gw + x]) continue;
      const i = (Math.min(h - 1, y * schritt) * w + Math.min(w - 1, x * schritt)) * 4;
      proben.push([d[i], d[i + 1], d[i + 2]]);
    }
  }
  proben.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const hell = proben.slice(Math.floor(proben.length * 0.5));
  const mitte = hell[Math.floor(hell.length / 2)] ?? [255, 255, 255];

  let gefuellt = 0;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!maske[gy * gw + gx]) continue;
      gefuellt++;
      for (let y = gy * schritt; y < Math.min(h, (gy + 1) * schritt); y++) {
        for (let x = gx * schritt; x < Math.min(w, (gx + 1) * schritt); x++) {
          const i = (y * w + x) * 4;
          d[i] = mitte[0];
          d[i + 1] = mitte[1];
          d[i + 2] = mitte[2];
        }
      }
    }
  }
  return { anteil: gefuellt / (gw * gh) };
}
