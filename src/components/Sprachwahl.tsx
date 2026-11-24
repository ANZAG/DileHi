import { Link, useLocation } from "react-router-dom";
import { spracheMerken, useAngeboteneSprachen, useSprache } from "@/hooks/useSprache";
import { SPRACHNAMEN, STANDARDSPRACHE, nurDeutsch, sprachPfad, type Sprache } from "@/lib/sprachen.mjs";

/**
 * Die Sprachwahl im Kopf: dieselbe Seite in einer anderen Sprache.
 *
 * Eine beschriftete Gruppe und kein eigenes <nav>: Sie steht mitten im
 * Hauptmenü, und ein Navigationsbereich im anderen hilft niemandem.
 *
 * Echte Verweise statt eines Aufklappmenüs – drei Kürzel brauchen keins, und
 * ein Verweis mit `hreflang` sagt auch einem Vorleseprogramm und einer
 * Suchmaschine, wohin er führt. Jeder Name steht in seiner eigenen Sprache
 * und ist so ausgezeichnet (`lang`), damit „Français" nicht deutsch
 * ausgesprochen wird.
 *
 * Erscheint nur, wo es etwas zu wählen gibt: nicht im Mitgliederbereich, und
 * nicht, solange keine Seite übersetzt ist.
 */
export default function Sprachwahl({ className = "", nachWahl }: { className?: string; nachWahl?: () => void }) {
  const ort = useLocation();
  const { sprache, t } = useSprache();
  const { sprachen } = useAngeboteneSprachen();

  if (nurDeutsch(ort.pathname)) return null;
  // Wer schon auf /fr/… steht, braucht den Weg zurück, auch wenn es (noch)
  // keine französische Seite gibt.
  const zurWahl: Sprache[] = [STANDARDSPRACHE, ...sprachen];
  if (!zurWahl.includes(sprache)) zurWahl.push(sprache);
  if (zurWahl.length < 2) return null;

  const hier = `${ort.pathname}${ort.search}${ort.hash}`;
  return (
    <div role="group" aria-label={t.sprachwahl} className={`flex items-center gap-0.5 ${className}`} data-sprachwahl>
      {zurWahl.map((s) => (
        <Link
          key={s}
          to={sprachPfad(hier, s)}
          hrefLang={s}
          lang={s}
          aria-label={SPRACHNAMEN[s]}
          title={SPRACHNAMEN[s]}
          aria-current={s === sprache ? "true" : undefined}
          onClick={() => {
            // Ab hier gilt, was angeklickt wurde – auch gegen die Browsersprache.
            spracheMerken(s);
            nachWahl?.();
          }}
          className={`px-1.5 py-1 text-xs font-medium uppercase tracking-wide rounded transition-colors hover:bg-muted ${
            s === sprache ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {s}
        </Link>
      ))}
    </div>
  );
}
