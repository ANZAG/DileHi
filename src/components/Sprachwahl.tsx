import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { spracheMerken, useAngeboteneSprachen, useSprache } from "@/hooks/useSprache";
import { SPRACHNAMEN, STANDARDSPRACHE, nurDeutsch, sprachPfad, type Sprache } from "@/lib/sprachen.mjs";

/**
 * Die Sprachwahl im Kopf: dieselbe Seite in einer anderen Sprache.
 *
 * Als kleine Klappe – ein Knopf mit dem Kürzel der aktuellen Sprache, dahinter
 * die Namen der Sprachen. Drei Kürzel nebeneinander nahmen der Menüleiste den
 * Platz, den die längeren französischen Menüpunkte brauchen. Im aufgeklappten
 * Menü des Telefons steht sie als Zeile (`art="zeile"`): Dort ist Platz, und
 * eine Klappe in der Klappe wäre ein Tippen mehr.
 *
 * In beiden Fassungen echte Verweise mit `hreflang`: So weiss auch ein
 * Vorleseprogramm und eine Suchmaschine, wohin sie führen. Jeder Name steht in
 * seiner eigenen Sprache und ist so ausgezeichnet (`lang`), damit „Français"
 * nicht deutsch ausgesprochen wird. Die Klappe selbst ist das Popover der
 * Anwendung (Radix): Escape schliesst, der Fokus kehrt zum Knopf zurück.
 *
 * Erscheint nur, wo es etwas zu wählen gibt: nicht im Mitgliederbereich, und
 * nicht, solange keine Seite übersetzt ist.
 */
export default function Sprachwahl({ className = "", art = "klappe", nachWahl }: {
  className?: string;
  art?: "klappe" | "zeile";
  nachWahl?: () => void;
}) {
  const ort = useLocation();
  const { sprache, t } = useSprache();
  const { sprachen } = useAngeboteneSprachen();
  const [offen, setOffen] = useState(false);
  const liste = useRef<HTMLUListElement>(null);

  if (nurDeutsch(ort.pathname)) return null;
  // Wer schon auf /fr/… steht, braucht den Weg zurück, auch wenn es (noch)
  // keine französische Seite gibt.
  const zurWahl: Sprache[] = [STANDARDSPRACHE, ...sprachen];
  if (!zurWahl.includes(sprache)) zurWahl.push(sprache);
  if (zurWahl.length < 2) return null;

  const hier = `${ort.pathname}${ort.search}${ort.hash}`;
  const verweis = (s: Sprache, klassen: string, inhalt: React.ReactNode) => (
    <Link
      to={sprachPfad(hier, s)}
      hrefLang={s}
      lang={s}
      aria-current={s === sprache ? "true" : undefined}
      onClick={() => {
        // Ab hier gilt, was angeklickt wurde – auch gegen die Browsersprache.
        spracheMerken(s);
        setOffen(false);
        nachWahl?.();
      }}
      className={klassen}
    >
      {inhalt}
    </Link>
  );

  if (art === "zeile") {
    return (
      <div role="group" aria-label={t.sprachwahl} className={`flex items-center gap-1 ${className}`} data-sprachwahl>
        <Globe size={14} className="text-muted-foreground shrink-0" aria-hidden />
        {zurWahl.map((s) => (
          <span key={s}>
            {verweis(
              s,
              `block px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
                s === sprache ? "text-primary font-medium" : "text-muted-foreground"
              }`,
              SPRACHNAMEN[s],
            )}
          </span>
        ))}
      </div>
    );
  }

  /** Pfeiltasten wandern durch die Liste – wie man es von einer Klappe erwartet. */
  const pfeile = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    const verweise = [...e.currentTarget.querySelectorAll<HTMLAnchorElement>("a")];
    const hier = verweise.indexOf(document.activeElement as HTMLAnchorElement);
    const ziel = e.key === "Home" ? 0
      : e.key === "End" ? verweise.length - 1
      : (hier + (e.key === "ArrowDown" ? 1 : -1) + verweise.length) % verweise.length;
    e.preventDefault();
    verweise[ziel]?.focus();
  };

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // Der Name der Gruppe und die aktuelle Sprache, ausgeschrieben: „FR"
          // allein sagt einem Vorleseprogramm nichts.
          aria-label={`${t.sprachwahl}: ${SPRACHNAMEN[sprache]}`}
          title={t.sprachwahl}
          data-sprachwahl
          className={`flex items-center gap-1 px-2 py-2 text-sm font-medium rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
        >
          <Globe size={15} aria-hidden />
          <span className="uppercase">{sprache}</span>
          <ChevronDown size={13} aria-hidden className={offen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto min-w-[9rem] p-1"
        // Der Fokus geht beim Öffnen auf die aktuelle Sprache statt auf den
        // Rahmen der Klappe: Von dort führen Pfeile und Tab weiter.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          liste.current?.querySelector<HTMLAnchorElement>("a[aria-current]")?.focus();
        }}
      >
        <ul ref={liste} aria-label={t.sprachwahl} onKeyDown={pfeile} data-sprachwahl-liste>
          {zurWahl.map((s) => (
            <li key={s}>
              {verweis(
                s,
                `flex items-center justify-between gap-4 px-3 py-2 text-sm rounded-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-none ${
                  s === sprache ? "text-primary font-medium" : "text-foreground"
                }`,
                <>
                  {SPRACHNAMEN[s]}
                  <span className="text-xs uppercase text-muted-foreground" aria-hidden>{s}</span>
                </>,
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
