import { Check, AlertTriangle } from "lucide-react";

export interface CoverageItem {
  key: string;
  label: string;
  /** Was vorhanden ist. */
  have: number;
  /** Was gebraucht wird. */
  need: number;
  /** Einheit im Klartext, z. B. "Schlafplätze". */
  unit: string;
  /** Woher die beiden Zahlen kommen – damit niemand raten muss. */
  hint: string;
}

/**
 * Bedarfsabgleich.
 *
 * Die Planungsfragen des Vereins sind fast alle "reicht X für Y?", nicht
 * "wie viele X". Bisher standen die beiden Zahlen an verschiedenen Stellen
 * der Seite und der Vergleich passierte im Kopf.
 */
export default function EvalCoverage({ items }: { items: CoverageItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-6">
      {items.map((item) => {
        const short = item.need - item.have;
        const covered = short <= 0;
        return (
          <div
            key={item.key}
            className={`border rounded-lg p-4 ${
              covered ? "" : "border-amber-400/70 bg-amber-50/50 dark:bg-amber-950/20"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-sm">{item.label}</h3>
              {covered ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                  <Check size={14} /> reicht
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} /> {short} fehlen
                </span>
              )}
            </div>

            <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
              {item.have}
              <span className="text-base font-normal text-muted-foreground"> von {item.need}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{item.unit}</p>
            <p className="text-xs text-muted-foreground mt-2">{item.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
