import { useState, type ImgHTMLAttributes } from "react";
import { srcsetVon } from "@/lib/bildfassungen.mjs";

/** Ein Bild aus der Ablage, so wie die Abfragen es liefern. */
export interface GespeichertesBild {
  src: string;
  alt: string;
  breite?: number | null;
  hoehe?: number | null;
  fassungen?: number[] | null;
}

/**
 * Ein Bild aus der Ablage – mit seinen kleineren Fassungen.
 *
 * Der Browser bekommt über `srcset` alle Fassungen angeboten und lädt die,
 * die zu seinem Bildschirm passt (src/lib/bildfassungen.mjs). `sizes` sagt
 * ihm, wie breit das Bild erscheint. „auto" heisst: so breit, wie es im
 * Layout tatsächlich ist. Das geht nur bei `loading="lazy"` und nur, wenn die
 * Breite vom Platz kommt und nicht vom Bild selbst – sonst nimmt Chrome
 * 300 px an und das Bild wird unscharf. Die Angabe dahinter gilt für Browser,
 * die „auto" nicht kennen.
 *
 * Breite und Höhe aus der Bildzeile halten dem Bild seinen Platz frei, bevor
 * es geladen ist. Ohne sie springt der Text darunter, sobald es erscheint.
 *
 * Fehlt eine Fassung doch einmal, fällt das Bild auf das Original zurück,
 * statt als zerbrochenes Symbol stehen zu bleiben.
 */
export function SpeicherBild({
  bild, sizes = "100vw", vorrang = false, alt, width, height, onError, ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  bild: GespeichertesBild;
  /** Das Bild im Kopf der Seite: sofort und vor allem anderen laden. */
  vorrang?: boolean;
}) {
  const [nurOriginal, setNurOriginal] = useState(false);
  const srcSet = nurOriginal ? undefined : srcsetVon(bild);
  return (
    // Reihenfolge mit Absicht: `loading`, `sizes` und `srcset` stehen vor
    // `src`. React setzt die Attribute in dieser Reihenfolge, und manche
    // Browser beginnen mit dem Laden, sobald `src` dasteht.
    <img
      {...rest}
      {...(vorrang ? { fetchpriority: "high" } : {})}
      sizes={srcSet ? sizes : undefined}
      srcSet={srcSet}
      src={bild.src}
      alt={alt ?? bild.alt}
      width={width ?? bild.breite ?? undefined}
      height={height ?? bild.hoehe ?? undefined}
      onError={(e) => {
        if (srcSet) setNurOriginal(true);
        onError?.(e);
      }}
    />
  );
}
