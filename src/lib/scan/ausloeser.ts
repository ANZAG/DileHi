/**
 * Der Auslöser, der von selbst auslöst: Umblättern ist Bewegung im Bild.
 * Steht das Bild danach eine Weile still, liegt die neue Seite – Foto.
 *
 * Verglichen werden kleine Graubilder (etwa 64 × 36 Punkte) aufeinander
 * folgender Videobilder. Das ist billig und reicht, um eine Hand von
 * Bildrauschen zu unterscheiden.
 */

export interface AusloeserEinstellung {
  /** Ab dieser mittleren Abweichung (0…255) gilt ein Bild als bewegt. */
  bewegt: number;
  /** Darunter gilt es als ruhig. Dazwischen bleibt der Zustand, wie er ist. */
  ruhig: number;
  /** So lange muss es ruhig sein, bevor ausgelöst wird (ms). */
  ruhezeit: number;
}

export const STANDARD_AUSLOESER: AusloeserEinstellung = { bewegt: 12, ruhig: 4, ruhezeit: 700 };

export type AusloeserZustand = "wartet_auf_umblaettern" | "bewegung" | "beruhigt";

/** Mittlere Abweichung zweier gleich grosser Graubilder. */
export function unterschied(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length || a.length === 0) return 255;
  let summe = 0;
  for (let i = 0; i < a.length; i++) summe += Math.abs(a[i] - b[i]);
  return summe / a.length;
}

export class Ausloeser {
  private zustand: AusloeserZustand;
  private ruhigSeit = 0;

  /**
   * `sofort`: Die erste ruhige Seite wird gleich aufgenommen, ohne dass
   * vorher geblättert werden muss – so beginnt man ein Buch.
   */
  constructor(private e: AusloeserEinstellung = STANDARD_AUSLOESER, sofort = true) {
    this.zustand = sofort ? "bewegung" : "wartet_auf_umblaettern";
  }

  get stand(): AusloeserZustand {
    return this.zustand;
  }

  /**
   * Ein neuer Vergleich. Gibt `true` zurück, wenn jetzt ausgelöst werden soll.
   * Danach wartet der Auslöser auf das nächste Umblättern.
   */
  melden(abweichung: number, jetzt: number): boolean {
    if (abweichung >= this.e.bewegt) {
      this.zustand = "bewegung";
      return false;
    }
    if (this.zustand === "wartet_auf_umblaettern") return false;
    if (abweichung > this.e.ruhig) {
      // Weder bewegt noch ruhig: Die Uhr beginnt von vorn.
      if (this.zustand === "beruhigt") this.zustand = "bewegung";
      return false;
    }
    if (this.zustand === "bewegung") {
      this.zustand = "beruhigt";
      this.ruhigSeit = jetzt;
      return false;
    }
    if (jetzt - this.ruhigSeit >= this.e.ruhezeit) {
      this.zustand = "wartet_auf_umblaettern";
      return true;
    }
    return false;
  }

  /** Nach einer Aufnahme von Hand: erst wieder nach dem Umblättern. */
  aufgenommen(): void {
    this.zustand = "wartet_auf_umblaettern";
  }
}
