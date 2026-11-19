import type { Drehung } from "./geometrie";

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
export function lageAus(beta: number, gamma: number, bisher: Drehung): Drehung {
  const { x, y } = schwerkraft(beta, gamma);
  const staerke = Math.hypot(x, y);
  if (staerke < SICHER) return bisher;
  // Winkel der Schwerkraft gegen „nach unten" im Bildschirm (0° = hochkant).
  // Handy gegen den Uhrzeigersinn gedreht (oben zeigt nach links): Die
  // Schwerkraft zeigt nach links (x < 0), das Foto ist im Uhrzeigersinn zu
  // drehen (90°).
  const winkel = (Math.atan2(-x, -y) * 180) / Math.PI; // −180 … 180
  const lage = ((Math.round(winkel / 90) * 90) % 360 + 360) % 360 as Drehung;
  // Nahe an der Grenze zweier Lagen (± 15°) bleibt es bei der bisherigen.
  const abstand = Math.abs(((winkel - lage + 540) % 360) - 180);
  if (lage !== bisher && abstand > 30) return bisher;
  return lage;
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
