import { Link } from "react-router-dom";
import { SPRACHNAMEN, ZUSATZSPRACHEN } from "@/lib/sprachen.mjs";
import { sprachstand, SPRACHSTAND_WORTE, type SeitenUebersetzung, type Sprachstand } from "@/components/sitebuilder/uebersetzungen";

type Kurzstand = Pick<SeitenUebersetzung, "page_id" | "lang" | "is_machine" | "is_stale" | "reviewed_at">;

/** Farbe nach Dringlichkeit: veraltet fällt auf, geprüft tritt zurück. */
const FARBE: Record<Sprachstand, string> = {
  fehlt: "border-dashed text-muted-foreground",
  veraltet: "border-amber-500 text-amber-700 dark:text-amber-400",
  maschinell: "border-border text-foreground",
  ungeprueft: "border-border text-foreground",
  geprueft: "border-primary/40 text-primary",
};

/**
 * Der Stand der Sprachfassungen einer Seite, jede ein Verweis in ihren Editor.
 *
 * Steht in der Seitenliste unter jeder Seite: Wer die Liste öffnet, sieht auf
 * einen Blick, was fehlt und was nach einer Änderung am Deutschen nachgezogen
 * werden muss.
 */
export default function SprachfassungenZeile({ seitenId, staende }: { seitenId: string; staende: Kurzstand[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 mt-1">
      {ZUSATZSPRACHEN.map((s) => {
        const stand = sprachstand(staende.find((z) => z.page_id === seitenId && z.lang === s));
        return (
          <Link
            key={s}
            to={`/intern/seiten/${seitenId}/${s}`}
            title={`${SPRACHNAMEN[s]}: ${SPRACHSTAND_WORTE[stand]} – bearbeiten`}
            className={`text-[11px] leading-none px-1.5 py-1 rounded border hover:bg-muted transition-colors ${FARBE[stand]}`}
          >
            <span className="uppercase font-semibold">{s}</span> {SPRACHSTAND_WORTE[stand]}
          </Link>
        );
      })}
    </span>
  );
}
