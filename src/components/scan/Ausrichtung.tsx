/**
 * Ausrichtungshilfe über dem Kamerabild, wie bei der iPhone-Kamera:
 *
 * - Wasserwaage: ein festes Kreuz in der Mitte und ein bewegliches, das der
 *   Neigung des Handys folgt. Liegen beide übereinander (unter 2°), hält
 *   man das Handy flach über dem Buch – das Foto wird nicht trapezförmig
 *   verzerrt. Erscheint nur, wenn das Handy ungefähr nach unten zeigt.
 * - Laserstrich: eine feste waagrechte Linie (für den, der das Handy hält)
 *   und die Richtung der gefundenen Seite. Dreht man das Handy, bis beide
 *   zusammenfallen (unter 1°), stehen die Zeilen gerade.
 */

import type { CSSProperties } from "react";

const PIXEL_JE_G = 460; // ≈ 8 Bildpunkte je Grad
const GRENZE = 90;

export interface AusrichtungProps {
  /** Schwerkraft in der Bildschirmebene (siehe `wasserwaage`), oder null ohne Lagesensor. */
  waage: { x: number; y: number; grad: number } | null;
  /** Schräglage der gefundenen Seite in Grad (siehe `seitenNeigung`), oder null. */
  neigung: number | null;
  /** So weit sind die Symbole gedreht: „waagrecht" für den, der das Handy hält. */
  drehung: number;
}

const kreuz = (farbe: string, dicke: number) => (
  <>
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 28, height: dicke, background: farbe }} />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: dicke, height: 28, background: farbe }} />
  </>
);

export function Ausrichtung({ waage, neigung, drehung }: AusrichtungProps) {
  const zeigeWaage = waage !== null && waage.grad < 25;
  const flach = zeigeWaage && waage!.grad < 2;
  const gerade = neigung !== null && Math.abs(neigung) < 1;
  const linie = (winkel: number, stil: string): CSSProperties => ({
    position: "absolute", left: "-25%", right: "-25%", top: "50%", height: 0,
    borderTop: stil, transform: `rotate(${winkel}deg)`, transition: "transform 0.15s",
  });
  const dx = waage ? Math.max(-GRENZE, Math.min(GRENZE, waage.x * PIXEL_JE_G)) : 0;
  const dy = waage ? Math.max(-GRENZE, Math.min(GRENZE, waage.y * PIXEL_JE_G)) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {neigung !== null && (
        <>
          <div style={linie(drehung, gerade ? "2px solid rgb(74 222 128)" : "1.5px dashed rgba(255,255,255,0.7)")} />
          {!gerade && <div style={linie(drehung + neigung, "2px solid rgb(245 158 11)")} />}
          <div className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${drehung}deg) translate(-50%, 48px)` }}>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${gerade ? "bg-green-600/90 text-white" : "bg-black/60 text-amber-300"}`}>
              {gerade ? "gerade" : `${Math.abs(neigung).toFixed(1).replace(".", ",")}° ${neigung > 0 ? "↻" : "↺"}`}
            </span>
          </div>
        </>
      )}
      {zeigeWaage && (
        <div className="absolute left-1/2 top-1/2 h-0 w-0">
          {kreuz(flach ? "rgb(74 222 128)" : "rgba(255,255,255,0.85)", 2)}
          {!flach && (
            <div className="absolute left-0 top-0" style={{ transform: `translate(${dx}px, ${dy}px)`, transition: "transform 0.1s" }}>
              {kreuz("rgb(245 158 11)", 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
