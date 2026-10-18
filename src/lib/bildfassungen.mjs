// Kleinere Fassungen der Bilder im Speicher.
//
// Ein Foto liegt mit bis zu 1920 px Breite in der Ablage, auf dem Handy
// erscheint es aber oft nur 350 px breit. PageSpeed zählte auf der Startseite
// 362 KiB, die das Handy lädt und nie zeigt. Deshalb liegt neben jedem Bild
// eine Reihe kleinerer Fassungen, und der Browser wählt über `srcset` selbst
// die, die er für seinen Bildschirm braucht.
//
// Die Fassungen liegen unter _fassungen/<breite>/<pfad> – derselbe Name wie
// das Original, nur in einem Unterordner. Welche es zu einem Bild gibt, steht
// in der Bildzeile (site_images.fassungen, gallery_images.fassungen): Nur was
// dort steht, kommt ins `srcset`. Ein Bild ohne Eintrag zeigt einfach das
// Original, wie bisher.
//
// Gemeinsam genutzt von der Anwendung (SpeicherBild, Hochladen), vom Bau
// (scripts/vorabSeiten.mjs, für das Vorladen des Kopfbilds) und vom
// Aufbereiten der vorhandenen Bilder (scripts/bilder-verkleinern.mjs).

/** Der Unterordner der Ablage, in dem die Fassungen liegen. */
export const FASSUNGEN_ORDNER = "_fassungen";

/**
 * Die Breiten der Fassungen. Gewählt nach den Plätzen der Seite: eine Kachel
 * auf dem Handy (um 350 px, mal Pixeldichte 2–3), das Kopfbild auf dem Handy,
 * eine halbe Spalte am Rechner, das ganze Bild am Rechner.
 */
export const BREITEN = [400, 640, 960, 1280];

/**
 * Welche Fassungen ein Bild dieser Breite bekommt: nur die deutlich kleineren.
 * Eine Fassung mit 960 px zu einem Original mit 1000 px spart nichts.
 */
export function noetigeBreiten(breite) {
  const b = Number(breite) || 0;
  return BREITEN.filter((w) => w <= b * 0.85);
}

/** Wo die Fassung eines Bildes in der Ablage liegt. */
export function fassungPfad(pfad, breite) {
  return `${FASSUNGEN_ORDNER}/${breite}/${String(pfad).replace(/^\/+/, "")}`;
}

const ABLAGE = "/storage/v1/object/public/gallery/";

/**
 * Das `srcset` zu einem Bild aus der Ablage – oder `undefined`, wenn es keine
 * Fassungen hat oder nicht aus der Ablage kommt.
 *
 * Gebildet aus der öffentlichen Adresse des Originals, damit Anwendung und
 * Bau dieselbe Zeichenkette erzeugen: Nur dann nutzt der Browser das
 * vorgeladene Kopfbild.
 */
export function srcsetVon(bild) {
  const src = bild?.src;
  const breite = Number(bild?.breite) || 0;
  const fassungen = Array.isArray(bild?.fassungen) ? bild.fassungen : [];
  if (!src || !breite || fassungen.length === 0) return undefined;
  const i = src.indexOf(ABLAGE);
  if (i < 0) return undefined;
  const basis = src.slice(0, i + ABLAGE.length);
  const rest = src.slice(i + ABLAGE.length);
  const teile = [...new Set(fassungen.map(Number))]
    .filter((w) => Number.isInteger(w) && w > 0 && w < breite)
    .sort((a, b) => a - b)
    .map((w) => `${basis}${FASSUNGEN_ORDNER}/${w}/${rest} ${w}w`);
  if (teile.length === 0) return undefined;
  return [...teile, `${src} ${breite}w`].join(", ");
}
