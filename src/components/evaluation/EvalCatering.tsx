import { UtensilsCrossed, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

export interface CateringDay {
  /** yyyy-MM-dd */
  day: string;
  total: number;
  /** Ernährungsweise → Anzahl. Schlüssel "—" steht für "keine Angabe". */
  byDiet: Record<string, number>;
}

export interface AllergyNote {
  name: string;
  text: string;
}

interface Props {
  days: CateringDay[];
  /** Antwortmöglichkeiten des Ernährungsfeldes, in der Reihenfolge des Formulars. */
  dietOptions: string[];
  allergies: AllergyNote[];
  /** Erhebt das Formular überhaupt die Ernährungsweise? */
  hasDiet: boolean;
}

const NO_ANSWER = "—";

/**
 * Verpflegung je Tag.
 *
 * Die Zahl, die die Küche braucht, gab es bisher nicht: Es gab die Belegung je
 * Tag und es gab die Ernährungsweise, aber nie die Kombination. Wer für Samstag
 * kocht, musste beides im Kopf zusammenbringen.
 *
 * Ohne Ernährungsfeld bleibt die Tagesbelegung – dann eben ohne Aufschlüsselung,
 * statt einer Tabelle voller Nullen.
 */
export default function EvalCatering({ days, dietOptions, allergies, hasDiet }: Props) {
  if (days.length === 0) return null;

  // Nur Spalten zeigen, die auch vorkommen – eine Spalte "vegan: 0, 0, 0" hilft
  // niemandem beim Einkaufen.
  const usedDiets = [...dietOptions, NO_ANSWER].filter((d) =>
    days.some((day) => (day.byDiet[d] ?? 0) > 0)
  );
  const showDiets = hasDiet && usedDiets.length > 0;
  const maxTotal = Math.max(...days.map((d) => d.total), 0);

  const dayLabel = (iso: string) => {
    try {
      return format(parseISO(iso), "EE, d. MMM", { locale: de });
    } catch {
      return iso;
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <UtensilsCrossed size={16} />
        {showDiets ? "Verpflegung je Tag" : "Teilnehmer je Tag"}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[320px]">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left font-medium py-1.5 pr-3">Tag</th>
              <th className="text-right font-medium py-1.5 px-2">Personen</th>
              {showDiets &&
                usedDiets.map((d) => (
                  <th key={d} className="text-right font-medium py-1.5 px-2 whitespace-nowrap">
                    {d === NO_ANSWER ? "ohne Angabe" : d}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.day} className="border-b last:border-b-0">
                <td className="py-1.5 pr-3 whitespace-nowrap">{dayLabel(day.day)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums font-semibold">
                  {day.total}
                  {day.total === maxTotal && maxTotal > 0 && days.length > 1 && (
                    <span className="text-xs font-normal text-muted-foreground"> · stärkster Tag</span>
                  )}
                </td>
                {showDiets &&
                  usedDiets.map((d) => (
                    <td key={d} className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                      {day.byDiet[d] ?? 0}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allergies.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            Allergien und Unverträglichkeiten
          </p>
          <ul className="space-y-1">
            {allergies.map((a, i) => (
              <li key={`${a.name}-${i}`} className="text-sm">
                <span className="font-medium">{a.name}:</span>{" "}
                <span className="text-muted-foreground">{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
