import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookMarked, BookOpenText, FileText, Image as ImageIcon, Library, Loader2, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rahmen, StufeAbzeichen, Text } from "@/components/bibliothek/Bausteine";
import { useDarstellungen, useKarten, useSeiten, useSuche, useThemen, type Treffer } from "@/hooks/useBibliothek";
import { useBibliotheksrechte } from "@/hooks/useBibliothek";

const ART: Record<Treffer["kind"], { label: string; pfad: (id: string) => string; icon: typeof FileText }> = {
  topic: { label: "Themenseite", pfad: (id) => `/intern/bibliothek/thema/${id}`, icon: BookOpenText },
  card: { label: "Karte", pfad: (id) => `/intern/bibliothek/karte/${id}`, icon: FileText },
  source: { label: "Quelle", pfad: (id) => `/intern/bibliothek/quelle/${id}`, icon: BookMarked },
  plate: { label: "Bildtafel", pfad: (id) => `/intern/bibliothek/tafel/${id}`, icon: ImageIcon },
};

/**
 * Einstieg in die Wissensbibliothek: Suche über alles, die Darstellungen und
 * was für alle gilt (Quellenregister, Methode).
 *
 * Die Suche steht oben und hat den Fokus nicht von selbst – auf dem Handy
 * würde sonst sofort die Tastatur die halbe Seite verdecken.
 */
export default function BibliothekStart() {
  const { pflegen } = useBibliotheksrechte();
  const [params, setParams] = useSearchParams();
  const [eingabe, setEingabe] = useState(params.get("q") ?? "");
  const [begriff, setBegriff] = useState(eingabe);

  useEffect(() => {
    const t = setTimeout(() => {
      setBegriff(eingabe);
      setParams(eingabe.trim() ? { q: eingabe } : {}, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [eingabe, setParams]);

  const { data: treffer = [], isFetching } = useSuche(begriff);
  const { data: darstellungen = [], isLoading } = useDarstellungen();
  const { data: karten = [] } = useKarten();
  const { data: themen = [] } = useThemen();
  const { data: seiten = [] } = useSeiten();
  const start = seiten.find((s) => s.slug === "start");
  const weitere = seiten.filter((s) => s.slug !== "start");
  const suchtGerade = begriff.trim().length >= 2;
  const kartenVon = (id: string) => karten.filter((k) => k.presentation_id === id);

  return (
    <Rahmen
      krumen={[{ label: "Wissensbibliothek" }]}
      titel="Wissensbibliothek"
      untertitel="Was wir herausgefunden haben – mit Fundstelle, Wortlaut und Seitenbild."
      aktion={pflegen && (
        <Button asChild size="sm" variant="outline">
          <Link to="/intern/bibliothek/pflege"><Settings2 size={15} className="mr-1" /> Pflege</Link>
        </Button>
      )}
    >
      <div className="relative mb-6">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder="Stichwort, Wortlaut oder Kartennummer …"
          aria-label="In der Wissensbibliothek suchen"
          className="h-12 pl-10 text-base"
        />
        {isFetching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {suchtGerade ? (
        <section aria-live="polite">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            {treffer.length === 0 && !isFetching ? "Nichts gefunden." : `${treffer.length}${treffer.length === 60 ? "+" : ""} Treffer`}
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {treffer.map((t) => {
              const art = ART[t.kind];
              const karte = t.kind === "card" ? karten.find((k) => k.id === t.id) : undefined;
              const thema = t.kind === "topic";
              return (
                <li key={`${t.kind}-${t.id}`}>
                  <Link to={art.pfad(t.id)} className={`flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 ${thema ? "bg-primary/5" : ""}`}>
                    {karte ? <StufeAbzeichen stufe={karte.grade} /> : <art.icon size={18} className={`mt-0.5 shrink-0 ${thema ? "text-primary" : "text-muted-foreground"}`} />}
                    <span className="min-w-0">
                      <span className={`block ${thema ? "font-semibold" : ""}`}>{t.title}</span>
                      {thema && t.summary && <span className="my-0.5 block text-sm text-muted-foreground line-clamp-3">{t.summary}</span>}
                      <span className="text-xs text-muted-foreground">
                        {art.label} <span className="font-mono">{t.id}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section>
            <h2 className="font-serif text-xl font-bold mb-3">Darstellungen</h2>
            {isLoading ? (
              <Loader2 className="animate-spin text-muted-foreground" />
            ) : darstellungen.length === 0 ? (
              <p className="text-muted-foreground">
                Noch keine Darstellung angelegt.{pflegen && " Unter „Pflege“ lässt sich der Ordner der Bibliothek aus SharePoint einlesen."}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {darstellungen.map((d) => (
                  <li key={d.id}>
                    <Link to={`/intern/bibliothek/${d.id}`} className="block h-full rounded-lg border bg-card p-4 hover:border-primary/50">
                      <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                      <span className="block font-semibold leading-snug">{d.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {[d.epoch, d.period].filter(Boolean).join(" · ")}
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {themen.filter((t) => t.presentation_id === d.id).length} Themenseiten · {kartenVon(d.id).length} Karten
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="space-y-4">
            {start?.body && (
              <div className="rounded-lg border bg-card p-4">
                <h2 className="font-semibold mb-1">{start.title}</h2>
                <Text inhalt={start.body} />
              </div>
            )}
            <nav aria-label="Für alle Darstellungen" className="rounded-lg border bg-card p-2">
              <Link to="/intern/bibliothek/quellen" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted/60">
                <Library size={16} /> Quellenregister
              </Link>
              {weitere.map((s) => (
                <Link key={s.slug} to={`/intern/bibliothek/seite/${s.slug}`} className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted/60">
                  <FileText size={16} /> {s.title}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </Rahmen>
  );
}
