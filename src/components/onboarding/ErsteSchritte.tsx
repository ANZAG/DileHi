import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GRUPPEN } from "./schritte";
import { useTour, tourStarten } from "./useTour";

/**
 * „Erste Schritte“ auf der Startseite des Mitgliederbereichs.
 *
 * Dieselbe Liste wie die Tour, nur ohne Overlay: Wer die Tour weggeklickt hat
 * oder sie in Etappen machen will, sieht hier, was noch offen ist, und kann
 * einzelne Punkte anspringen oder abhaken.
 *
 * Sobald nichts mehr offen ist, verschwindet der Kasten. Er kommt wieder,
 * wenn ein Schritt hinzukommt – deshalb steht hier keine Liste, sondern
 * dieselbe Abfrage wie in der Tour.
 */
export default function ErsteSchritte() {
  const { moeglich, offen, bereit, merken } = useTour();
  const [alleZeigen, setAlleZeigen] = useState(false);

  if (!bereit || offen.length === 0) return null;

  const erledigt = moeglich.length - offen.length;
  const sichtbar = alleZeigen ? offen : offen.slice(0, 4);

  return (
    <div className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-serif text-base sm:text-lg font-semibold">Erste Schritte</h2>
        <p className="text-xs text-muted-foreground">
          {erledigt} von {moeglich.length} erledigt
        </p>
      </div>

      <Progress value={(erledigt / moeglich.length) * 100} className="h-1.5 mb-4" />

      <ul className="space-y-1">
        {sichtbar.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-2 sm:gap-3 py-1.5 border-b last:border-0"
          >
            <s.icon size={18} className="text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{s.titel}</p>
              <p className="text-xs text-muted-foreground">{GRUPPEN[s.gruppe]}</p>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => tourStarten(s.key)}>
              Zeigen
            </Button>
            <button
              onClick={() => merken([s.key])}
              aria-label={`${s.titel} abhaken`}
              title="Erledigt"
              className="shrink-0 p-1.5 rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Check size={14} />
            </button>
          </li>
        ))}
      </ul>

      {offen.length > 4 && (
        <button
          onClick={() => setAlleZeigen(!alleZeigen)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {alleZeigen ? (
            <>
              <ChevronUp size={14} /> Weniger zeigen
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Alle {offen.length} zeigen
            </>
          )}
        </button>
      )}
    </div>
  );
}
