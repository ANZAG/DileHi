import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2 } from "lucide-react";
import { ausschnittTeile, imTextSuchen, type TextTreffer } from "@/lib/scan/quelltext";

/**
 * Treffer im Text der Quellen, für die Suche der Quellensammlung. Je Quelle
 * die Fundseiten mit Ausschnitt. Gesucht wird über alle Epochen – wer einen
 * Begriff sucht, weiss oft nicht, in welchem Buch er steht.
 */

interface Props {
  suche: string;
  epochName: (wert: string) => string;
  onOeffnen: (sourceId: string, seite: number) => void;
}

export function TextTrefferListe({ suche, epochName, onOeffnen }: Props) {
  const [verzoegert, setVerzoegert] = useState(suche);
  useEffect(() => {
    const t = setTimeout(() => setVerzoegert(suche.trim()), 350);
    return () => clearTimeout(t);
  }, [suche]);

  const { data: treffer = [], isFetching, error } = useQuery({
    queryKey: ["source-text-search", verzoegert],
    enabled: verzoegert.length >= 3,
    queryFn: () => imTextSuchen(verzoegert),
  });

  if (verzoegert.length < 3) return null;

  const nachQuelle = new Map<string, TextTreffer[]>();
  for (const t of treffer) nachQuelle.set(t.source_id, [...(nachQuelle.get(t.source_id) ?? []), t]);

  return (
    <div className="space-y-3 mt-6">
      <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
        <FileSearch size={16} /> Im Text der Quellen
        {isFetching && <Loader2 size={14} className="animate-spin" />}
      </p>
      {error && <p className="text-sm text-muted-foreground">Die Textsuche ist gerade nicht erreichbar ({(error as Error).message}).</p>}
      {!isFetching && !error && treffer.length === 0 && (
        <p className="text-sm text-muted-foreground">Kein Treffer im Text. Durchsuchbar sind gescannte Quellen mit Texterkennung.</p>
      )}
      {[...nachQuelle.values()].map((liste) => (
        <div key={liste[0].source_id} className="p-3 rounded-lg border bg-card space-y-2">
          <p className="text-sm font-medium">
            {liste[0].title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{epochName(liste[0].epoch)}</span>
          </p>
          {liste.slice(0, 5).map((t) => (
            <button
              key={t.page}
              type="button"
              onClick={() => onOeffnen(t.source_id, t.page)}
              className="block w-full text-left text-xs rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <span className="font-medium text-primary mr-2 whitespace-nowrap">PDF-Seite {t.page}</span>
              <span className="text-muted-foreground">
                {ausschnittTeile(t.snippet).map(([text, hervor], i) =>
                  hervor ? <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{text}</mark> : <span key={i}>{text}</span>
                )}
              </span>
            </button>
          ))}
          {liste.length > 5 && <p className="text-xs text-muted-foreground px-2">und {liste.length - 5} weitere Seiten</p>}
        </div>
      ))}
    </div>
  );
}
