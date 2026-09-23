import type { ReactNode } from "react";
import { BAUSTEIN_KATALOG, type Skizze } from "./bausteinKatalog";

/**
 * Ein Eintrag in der Bausteinleiste: Name, Skizze und ein Satz dazu.
 *
 * Puck liefert den Namen samt Griff zum Ziehen als `children`; der bleibt,
 * wie er ist, damit Ziehen und Tastaturbedienung unverändert funktionieren.
 * Darunter steht, wofür der Baustein gut ist und wie er ungefähr aussieht.
 */
export function BausteinKarte({ name, children }: { name: string; children: ReactNode }) {
  const eintrag = BAUSTEIN_KATALOG[name];
  if (!eintrag) return <>{children}</>;
  return (
    <div className="baustein-karte rounded-md border bg-background transition-colors hover:border-primary/60" title={eintrag.kurz}>
      {children}
      <div className="flex gap-2.5 px-3 pb-2.5 pt-0.5">
        <SkizzeBild skizze={eintrag.skizze} />
        <p className="text-[11px] leading-snug text-muted-foreground">{eintrag.kurz}</p>
      </div>
    </div>
  );
}

/** Die Skizze als kleine SVG-Grafik in den Farben der Installation. */
function SkizzeBild({ skizze }: { skizze: Skizze }) {
  return (
    <svg viewBox="0 0 120 72" className="h-[42px] w-[70px] shrink-0 rounded-sm border bg-card" aria-hidden>
      {skizze.map(([art, x, y, w, h], i) => {
        switch (art) {
          case "bild":
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill="hsl(var(--muted-foreground) / 0.28)" />
                <path d={`M${x} ${y + h} L${x + w * 0.4} ${y + h * 0.45} L${x + w * 0.65} ${y + h * 0.7} L${x + w * 0.8} ${y + h * 0.55} L${x + w} ${y + h}`} fill="hsl(var(--muted-foreground) / 0.25)" />
              </g>
            );
          case "farbe":
            return <rect key={i} x={x} y={y} width={w} height={h} fill="hsl(var(--primary) / 0.35)" />;
          case "flaeche":
            return <rect key={i} x={x} y={y} width={w} height={h} fill="hsl(var(--muted))" />;
          case "karte":
            return <rect key={i} x={x} y={y} width={w} height={h} fill="hsl(var(--background))" stroke="hsl(var(--foreground) / 0.45)" strokeWidth={1} />;
          case "titel":
            return <rect key={i} x={x} y={y} width={w} height={Math.max(3, h)} rx={1} fill="hsl(var(--foreground) / 0.7)" />;
          case "wort":
            return <rect key={i} x={x} y={y} width={w} height={h} rx={1} fill="hsl(var(--primary))" />;
          case "linie":
            return <rect key={i} x={x} y={y} width={Math.max(1, w)} height={Math.max(1, h)} fill="hsl(var(--foreground) / 0.55)" />;
          case "knopf":
            return <rect key={i} x={x} y={y} width={w} height={h} rx={2} fill="hsl(var(--primary))" />;
          case "text": {
            // So viele Zeilen, wie in die Fläche passen; die letzte kürzer.
            const zeilen = Math.max(1, Math.floor((h + 2) / 5));
            return (
              <g key={i} fill="hsl(var(--muted-foreground) / 0.5)">
                {Array.from({ length: zeilen }, (_, z) => (
                  <rect key={z} x={x} y={y + z * 5} width={z === zeilen - 1 && zeilen > 1 ? w * 0.6 : w} height={2} rx={1} />
                ))}
              </g>
            );
          }
          default:
            return null;
        }
      })}
    </svg>
  );
}
