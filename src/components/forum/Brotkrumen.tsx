import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Krume {
  label: string;
  /** Ohne Ziel ist es die Seite, auf der man steht. */
  to?: string;
}

/**
 * Wo man im Forum gerade ist.
 *
 * Der Pfeil zurück führte eine Ebene hoch, verriet aber nicht, wohin. Wer aus
 * einer Benachrichtigung mitten in ein Thema springt, sieht jetzt, in welcher
 * Rubrik es steht, und kommt mit einem Klick dorthin oder ganz nach oben.
 */
export default function Brotkrumen({ teile }: { teile: Krume[] }) {
  return (
    <nav aria-label="Brotkrumen" className="mb-3 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0">
        {teile.map((k, i) => (
          <li key={`${k.label}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />}
            {k.to ? (
              <Link to={k.to} className="hover:text-foreground hover:underline truncate max-w-[16rem]">
                {k.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground truncate max-w-[20rem]">
                {k.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
