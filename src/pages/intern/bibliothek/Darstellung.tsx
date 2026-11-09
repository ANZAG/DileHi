import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { KartenZeile, Rahmen, Text } from "@/components/bibliothek/Bausteine";
import { useDarstellungen, useKarten } from "@/hooks/useBibliothek";
import { BEREICHE, type Stufe } from "@/lib/bibliothek";

/**
 * Eine Darstellung: die Belegkarten in den neun Sachbereichen.
 *
 * Die neun Bereiche haben in jeder Darstellung dieselbe Nummer; nur der Name
 * darf sich unterscheiden. Leere Bereiche stehen trotzdem da – man sieht so,
 * wo noch nichts belegt ist.
 */
export default function BibliothekDarstellung() {
  const { darstellung: id } = useParams();
  const { data: darstellungen = [], isLoading } = useDarstellungen();
  const { data: karten = [] } = useKarten(id);
  const [stufe, setStufe] = useState<Stufe | null>(null);
  const [ebene, setEbene] = useState<string | null>(null);
  const d = darstellungen.find((x) => x.id === id);

  if (isLoading) return <Rahmen titel="Wissensbibliothek"><Loader2 className="animate-spin" /></Rahmen>;
  if (!d) {
    return (
      <Rahmen krumen={[{ label: "Wissensbibliothek", to: "/intern/bibliothek" }]} titel="Darstellung nicht gefunden">
        <p className="text-muted-foreground">Eine Darstellung „{id}“ gibt es nicht.</p>
      </Rahmen>
    );
  }

  const gefiltert = karten.filter((k) => (!stufe || k.grade === stufe) && (!ebene || k.level === ebene));
  const ebenenInGebrauch = d.levels.filter((l) => karten.some((k) => k.level === l));

  return (
    <Rahmen
      krumen={[{ label: "Wissensbibliothek", to: "/intern/bibliothek" }, { label: d.id }]}
      titel={d.title}
      untertitel={[d.epoch, d.period].filter(Boolean).join(" · ")}
    >
      {d.body && <Text inhalt={d.body} className="mb-4" />}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Stufe</span>
        {(["Q", "F", "A"] as Stufe[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStufe(stufe === s ? null : s)}
            aria-pressed={stufe === s}
            className={`rounded border px-2.5 py-1 ${stufe === s ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
          >
            {s}
          </button>
        ))}
        {ebenenInGebrauch.length > 1 && (
          <>
            <span className="ml-3 text-muted-foreground">Ebene</span>
            {ebenenInGebrauch.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setEbene(ebene === l ? null : l)}
                aria-pressed={ebene === l}
                className={`rounded border px-2.5 py-1 ${ebene === l ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
              >
                {l}
              </button>
            ))}
          </>
        )}
      </div>

      <nav aria-label="Sachbereiche" className="mb-6 flex flex-wrap gap-1.5 text-sm">
        {BEREICHE.map((b) => {
          const n = gefiltert.filter((k) => k.area === b).length;
          return (
            <a key={b} href={`#bereich-${b}`} className={`rounded-full border px-3 py-1 ${n ? "bg-card hover:bg-muted" : "text-muted-foreground"}`}>
              {b} {d.areas[String(b)] ?? `Bereich ${b}`} <span className="text-muted-foreground">({n})</span>
            </a>
          );
        })}
      </nav>

      <div className="space-y-6">
        {BEREICHE.map((b) => {
          const liste = gefiltert.filter((k) => k.area === b);
          return (
            <section key={b} id={`bereich-${b}`} className="scroll-mt-20">
              <h2 className="font-serif text-xl font-bold mb-1">
                <span className="text-muted-foreground mr-2">{b}</span>{d.areas[String(b)] ?? `Bereich ${b}`}
              </h2>
              {liste.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">Noch keine Karte{stufe || ebene ? " in dieser Auswahl" : ""}.</p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {liste.map((k) => <KartenZeile key={k.id} karte={k} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Rahmen>
  );
}
