import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Punkt, Viereck } from "@/lib/scan/geometrie";

/**
 * Das Viereck um die Seiten, zum Ziehen an den Ecken. Liegt über der
 * Vorschau (oder einem Foto) und rechnet in Anteilen 0…1, damit es zur
 * Auflösung der Kamera nicht passen muss.
 *
 * Bei einer Doppelseite zeigt eine Linie den Bund; auch sie lässt sich
 * ziehen.
 */

interface Props {
  viereck: Viereck;
  onViereck: (v: Viereck) => void;
  /** Lage des Bundes (Anteil der Breite) oder null für Einzelseiten. */
  bund: number | null;
  onBund?: (b: number) => void;
}

const lerp = (a: Punkt, b: Punkt, t: number): Punkt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const begrenzen = (v: number) => Math.max(0, Math.min(1, v));
const ECKEN = ["oben links", "oben rechts", "unten rechts", "unten links"];

export function ViereckEditor({ viereck, onViereck, bund, onBund }: Props) {
  const flaeche = useRef<HTMLDivElement>(null);
  const [greift, setGreift] = useState<number | "bund" | null>(null);

  const anteil = (e: ReactPointerEvent): Punkt => {
    const r = flaeche.current!.getBoundingClientRect();
    return { x: begrenzen((e.clientX - r.left) / r.width), y: begrenzen((e.clientY - r.top) / r.height) };
  };

  const bewegen = (e: ReactPointerEvent) => {
    if (greift === null) return;
    const p = anteil(e);
    if (greift === "bund") {
      // Den Bund auf die Mittellinie des Vierecks projizieren: wie weit
      // zwischen linker und rechter Kante liegt der Finger?
      const links = lerp(viereck[0], viereck[3], p.y);
      const rechts = lerp(viereck[1], viereck[2], p.y);
      const breite = rechts.x - links.x;
      if (Math.abs(breite) > 0.01) onBund?.(Math.max(0.2, Math.min(0.8, (p.x - links.x) / breite)));
      return;
    }
    const neu = [...viereck] as Viereck;
    neu[greift] = p;
    onViereck(neu);
  };

  const loslassen = () => setGreift(null);
  const punkte = viereck.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
  const bundOben = bund !== null ? lerp(viereck[0], viereck[1], bund) : null;
  const bundUnten = bund !== null ? lerp(viereck[3], viereck[2], bund) : null;
  const bundMitte = bundOben && bundUnten ? lerp(bundOben, bundUnten, 0.5) : null;

  return (
    <div
      ref={flaeche}
      className="absolute inset-0 touch-none select-none"
      onPointerMove={bewegen}
      onPointerUp={loslassen}
      onPointerCancel={loslassen}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        <polygon points={punkte} fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {bundOben && bundUnten && (
          <line
            x1={bundOben.x * 100} y1={bundOben.y * 100} x2={bundUnten.x * 100} y2={bundUnten.y * 100}
            stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {viereck.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Ecke ${ECKEN[i]} verschieben`}
          className="absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 border-primary bg-background/80 shadow cursor-grab active:cursor-grabbing"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setGreift(i); }}
          onPointerMove={bewegen}
          onPointerUp={loslassen}
        />
      ))}
      {bundMitte && onBund && (
        <button
          type="button"
          aria-label="Bund verschieben"
          className="absolute -translate-x-1/2 -translate-y-1/2 h-6 w-10 rounded-md border-2 border-primary bg-background/80 shadow text-[10px] font-medium text-primary cursor-ew-resize"
          style={{ left: `${bundMitte.x * 100}%`, top: `${bundMitte.y * 100}%` }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setGreift("bund"); }}
          onPointerMove={bewegen}
          onPointerUp={loslassen}
        >
          Bund
        </button>
      )}
    </div>
  );
}
