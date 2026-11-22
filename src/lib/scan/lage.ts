import type { Drehung, Viereck } from "./geometrie";

/**
 * Wie hält man das Handy? Wie die Kamera des iPhones: Der Bildschirm bleibt
 * stehen, aber das Foto wird richtig herum gespeichert, und die Symbole
 * drehen sich an ihrem Platz.
 *
 * Gemessen wird die Schwerkraft in der Ebene des Bildschirms (aus den
 * Winkeln beta und gamma von `deviceorientation`). Liegt das Handy flach
 * über dem Buch, zeigt sie fast nur noch durch den Bildschirm hindurch, und
 * die Lage ist nicht zu erkennen – dann gilt, wie beim iPhone, die letzte
 * sichere Lage. Man hebt das Handy also quer an und senkt es dann über das
 * Buch.
 */

/**
 * Die Schwerkraft in Bildschirmkoordinaten (x nach rechts, y nach oben), als
 * Anteil von 1 g. Aus der Drehfolge von `deviceorientation` (Z-X'-Y''):
 * g = (cos β · sin γ, −sin β).
 */
export function schwerkraft(beta: number, gamma: number): { x: number; y: number } {
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  return { x: Math.cos(b) * Math.sin(g), y: -Math.sin(b) };
}

/** Ab dieser Neigung (Anteil von 1 g in der Bildschirmebene, ≈ 20°) gilt die Lage als sicher. */
const SICHER = 0.34;

/**
 * Um wie viel Grad (im Uhrzeigersinn) Foto und Symbole zu drehen sind, damit
 * sie für den, der das Handy hält, aufrecht stehen. `bisher` gilt weiter,
 * solange das Handy zu flach liegt oder zwischen zwei Lagen kippt.
 */
export function lageAus(beta: number, gamma: number, bisher: Drehung, schwelle = SICHER, frei = false): Drehung {
  const { x, y } = schwerkraft(beta, gamma);
  const staerke = Math.hypot(x, y);
  if (staerke < schwelle) return bisher;
  // Winkel der Schwerkraft gegen „nach unten" im Bildschirm (0° = hochkant).
  // Handy gegen den Uhrzeigersinn gedreht (oben zeigt nach links): Die
  // Schwerkraft zeigt nach links (x < 0), das Foto ist im Uhrzeigersinn zu
  // drehen (90°).
  const winkel = (Math.atan2(-x, -y) * 180) / Math.PI; // −180 … 180
  const lage = ((Math.round(winkel / 90) * 90) % 360 + 360) % 360 as Drehung;
  // Nahe an der Grenze zweier Lagen (± 15°) bleibt es bei der bisherigen.
  const abstand = Math.abs(((winkel - lage + 540) % 360) - 180);
  if (!frei && lage !== bisher && abstand > 30) return bisher;
  return lage;
}

/**
 * Die beste Schätzung auch bei fast flachem Handy (ab etwa 3° Neigung) –
 * dient nur dazu, zwischen zwei Lagen zu wählen, die das Bild offen lässt.
 * Mit demselben Zögern an den Grenzen wie `lageAus`, damit das Foto nicht
 * hin- und herspringt, während das Handy ruhig über dem Buch liegt.
 */
export function lageGrob(beta: number, gamma: number, bisher: Drehung | null): Drehung | null {
  const { x, y } = schwerkraft(beta, gamma);
  if (Math.hypot(x, y) < 0.05) return bisher;
  return lageAus(beta, gamma, bisher ?? 0, 0, bisher === null);
}

/**
 * Wie liegt das Buch im ungedrehten Kamerabild: hochkant, quer – oder ist
 * das nicht klar zu sagen (fast quadratisch, schräg von der Seite)?
 * `breite`/`hoehe` sind die Masse des Bildes, das Viereck in Anteilen.
 */
export function buchForm(v: Viereck, breite: number, hoehe: number): "hoch" | "quer" | null {
  const l = (a: number, b: number) => Math.hypot((v[a].x - v[b].x) * breite, (v[a].y - v[b].y) * hoehe);
  const b = (l(0, 1) + l(3, 2)) / 2;
  const h = (l(0, 3) + l(1, 2)) / 2;
  if (h > b * 1.2) return "hoch";
  if (b > h * 1.2) return "quer";
  return null;
}

/**
 * Der Sensor sieht nicht, wie das Buch liegt, und flach über dem Buch sieht
 * er gar nichts mehr. Das Bild sieht es: Eine aufgeschlagene Doppelseite
 * ist breiter als hoch, eine Einzelseite (und ein Einband) höher als breit.
 * Passt die Lage des Sensors nicht dazu, gilt das Bild – nur ob es 90° oder
 * 270° (0° oder 180°) sind, bleibt offen; dafür gilt die grobe Schätzung
 * des Sensors, sonst 90° bzw. 0°. Steht die Seite danach auf dem Kopf,
 * dreht die Texterkennung sie nach der Aufnahme.
 */
export function lageMitBild(lage: Drehung, form: "hoch" | "quer" | null, doppel: boolean, grob: Drehung | null): Drehung {
  if (!form) return lage;
  const mussQuer = doppel ? form === "hoch" : form === "quer";
  const quer = (l: Drehung) => l === 90 || l === 270;
  if (quer(lage) === mussQuer) return lage;
  if (grob !== null && quer(grob) === mussQuer) return grob;
  return mussQuer ? 90 : 0;
}

/**
 * Die Drehung, die die Oberfläche selbst schon hat (Querformat ohne
 * Drehsperre): Dann liefert auch die Kamera ihr Bild schon gedreht, und es
 * bleibt weniger zu drehen.
 */
export function oberflaechenDrehung(): number {
  try {
    const a = screen.orientation?.angle;
    if (typeof a === "number") return a;
  } catch { /* älterer Browser */ }
  const alt = (window as unknown as { orientation?: number }).orientation;
  return typeof alt === "number" ? (alt + 360) % 360 : 0;
}

/** Drehung des Fotos aus der Lage des Handys und der Drehung der Oberfläche. */
export function fotoDrehung(lage: Drehung, oberflaeche: number): Drehung {
  return (((lage - oberflaeche) % 360) + 360) % 360 as Drehung;
}

type MitErlaubnis = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS fragt um Erlaubnis – nur aus einem Tippen heraus. */
export async function lageErlauben(): Promise<boolean> {
  const D = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : null) as unknown as MitErlaubnis | null;
  if (!D) return false;
  if (typeof D.requestPermission !== "function") return true;
  try {
    return (await D.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Muss iOS erst fragen? */
export const lageBrauchtErlaubnis = () =>
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof (DeviceOrientationEvent as unknown as MitErlaubnis).requestPermission === "function";

/**
 * Wasserwaage: Wie schief liegt das Handy über dem Buch? `x`, `y` ist die
 * Schwerkraft in der Ebene des Bildschirms (Anteil von 1 g) in Koordinaten
 * der Oberfläche (x nach rechts, y nach unten), `grad` die Neigung gegen
 * die Waagrechte. Liegt das Handy flach (Kamera senkrecht nach unten), ist
 * beides 0 – dann ist das Foto nicht verzerrt (kein Trapez), und die
 * Schrift steht gleich gross von oben bis unten.
 */
export function wasserwaage(beta: number, gamma: number, oberflaeche: number): { x: number; y: number; grad: number } {
  const g = schwerkraft(beta, gamma);
  // Gerät (y nach oben) in die Oberfläche: um deren Drehung gegen den Uhrzeigersinn.
  const a = (oberflaeche * Math.PI) / 180;
  const x = g.x * Math.cos(a) - g.y * Math.sin(a);
  const yOben = g.x * Math.sin(a) + g.y * Math.cos(a);
  const staerke = Math.min(1, Math.hypot(g.x, g.y));
  return { x, y: -yOben, grad: (Math.asin(staerke) * 180) / Math.PI };
}

/**
 * Wie schräg liegt die Seite im Bild? Der Winkel der vier Kanten des
 * Vierecks (in Bildpunkten der Anzeige, `breite` × `hoehe`),
 * gemittelt, als Abweichung von der nächsten Waagrechten oder Senkrechten:
 * im Uhrzeigersinn positiv, −45 … 45°. Dreht man das Handy um diesen
 * Winkel mit, stehen die Zeilen gerade.
 */
export function seitenNeigung(v: Viereck, breite: number, hoehe: number): number {
  const winkel = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    (Math.atan2((b.y - a.y) * hoehe, (b.x - a.x) * breite) * 180) / Math.PI;
  const rest = (w: number) => ((((w + 45) % 90) + 90) % 90) - 45;
  return (rest(winkel(v[0], v[1])) + rest(winkel(v[3], v[2])) + rest(winkel(v[0], v[3])) + rest(winkel(v[1], v[2]))) / 4;
}
