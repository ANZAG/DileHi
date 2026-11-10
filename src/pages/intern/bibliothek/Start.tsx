import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookMarked, BookOpenText, ClipboardCheck, FileText, Image as ImageIcon, Library, Loader2, Search, Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rahmen, StufeAbzeichen } from "@/components/bibliothek/Bausteine";
import {
  useBibliotheksrechte, useBildAdresse, useBilder, useDarstellungen, useKarten, useSeiten, useSuche, useThemen,
  type Darstellung, type Treffer,
} from "@/hooks/useBibliothek";
import { STUFE, abschnitt, offeneFragen, type Stufe } from "@/lib/bibliothek";

const ART: Record<Treffer["kind"], { label: string; pfad: (id: string) => string; icon: typeof FileText }> = {
  topic: { label: "Themenseite", pfad: (id) => `/intern/bibliothek/thema/${id}`, icon: BookOpenText },
  card: { label: "Karte", pfad: (id) => `/intern/bibliothek/karte/${id}`, icon: FileText },
  source: { label: "Quelle", pfad: (id) => `/intern/bibliothek/quelle/${id}`, icon: BookMarked },
  plate: { label: "Bildtafel", pfad: (id) => `/intern/bibliothek/tafel/${id}`, icon: ImageIcon },
};

const ERKLAERUNG: Record<Stufe, string> = {
  Q: "Quelle oder Literatur mit Fundstelle.",
  F: "Ein Autor schätzt es so ein, veröffentlicht.",
  A: "Analogie oder Rückschluss – kein Beleg für unsere Einheit selbst.",
};

const datum = (iso: string) => new Date(iso).toLocaleDateString("de-DE");

/**
 * Einstieg in die Wissensbibliothek (Z0, E8): Suche mit „häufig gesucht",
 * drei Wege hinein, die Darstellungen, offene Fragen, zuletzt Ergänztes und
 * die drei Belegstufen. Der lange Text zur Methode steht auf seiner eigenen
 * Seite, nicht mehr hier.
 *
 * Die Suche hat den Fokus nicht von selbst – auf dem Handy würde sonst
 * sofort die Tastatur die halbe Seite verdecken.
 */
export default function BibliothekStart() {
  const { pflegen } = useBibliotheksrechte();
  const [params, setParams] = useSearchParams();
  const [eingabe, setEingabe] = useState(params.get("q") ?? "");
  const [begriff, setBegriff] = useState(eingabe);
  const suchfeld = useRef<HTMLInputElement>(null);

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
  const methode = weitere.find((s) => s.slug === "methode");
  const suchtGerade = begriff.trim().length >= 2;

  // Bei nur einer Darstellung führen die Einstiege direkt hin, sonst zur Auswahl darunter.
  const einzige = darstellungen.length === 1 ? darstellungen[0] : null;
  const fragen = themen
    .flatMap((t) => offeneFragen(abschnitt(t.body, "Offen")).map((f) => ({ frage: f, thema: t })))
    .slice(0, 5);
  const neu = [...karten].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  const zurAuswahl = () => document.getElementById("darstellungen")?.scrollIntoView({ behavior: "smooth" });
  const einstieg = "flex h-full flex-col gap-1 rounded-lg border bg-card p-4 text-left hover:border-primary/50";

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
      <div className="mb-8">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={suchfeld}
            type="search"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            placeholder="Stichwort, Wortlaut oder Kartennummer …"
            aria-label="In der Wissensbibliothek suchen"
            className="h-12 pl-10 text-base"
          />
          {isFetching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {!!start?.frequent?.length && !suchtGerade && (
          <p className="mt-2 text-sm text-muted-foreground">
            Häufig gesucht:{" "}
            {start.frequent.map((w, i) => (
              <span key={w}>
                {i > 0 && " · "}
                <button type="button" onClick={() => setEingabe(w)} className="text-primary hover:underline">{w}</button>
              </span>
            ))}
          </p>
        )}
      </div>

      {suchtGerade ? (
        <section aria-live="polite">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
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
        <div className="space-y-10">
          <section aria-label="Einstiege" className="grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => suchfeld.current?.focus()} className={einstieg}>
              <Search size={20} className="text-primary" aria-hidden />
              <span className="font-semibold">Etwas nachsehen</span>
              <span className="text-sm text-muted-foreground">Ausrüstung, Einheit, Vorschrift, Quelle oder Kartennummer.</span>
            </button>
            {einzige ? (
              <Link to={`/intern/bibliothek/${einzige.id}`} className={einstieg}>
                <BookOpenText size={20} className="text-primary" aria-hidden />
                <span className="font-semibold">Eine Darstellung erkunden</span>
                <span className="text-sm text-muted-foreground">Zehn Kapitel von der Region bis zur Ausrüstung.</span>
              </Link>
            ) : (
              <button type="button" onClick={zurAuswahl} className={einstieg}>
                <BookOpenText size={20} className="text-primary" aria-hidden />
                <span className="font-semibold">Eine Darstellung erkunden</span>
                <span className="text-sm text-muted-foreground">Zehn Kapitel von der Region bis zur Ausrüstung.</span>
              </button>
            )}
            {einzige ? (
              <Link to={`/intern/bibliothek/${einzige.id}/pruefliste`} className={einstieg}>
                <ClipboardCheck size={20} className="text-primary" aria-hidden />
                <span className="font-semibold">Meine Ausrüstung prüfen</span>
                <span className="text-sm text-muted-foreground">Rolle wählen, Prüfliste öffnen.</span>
              </Link>
            ) : (
              <button type="button" onClick={zurAuswahl} className={einstieg}>
                <ClipboardCheck size={20} className="text-primary" aria-hidden />
                <span className="font-semibold">Meine Ausrüstung prüfen</span>
                <span className="text-sm text-muted-foreground">Darstellung wählen, dann Rolle und Prüfliste.</span>
              </button>
            )}
          </section>

          <section id="darstellungen" className="scroll-mt-20">
            <h2 className="mb-3 font-serif text-xl font-bold">Darstellungen</h2>
            {isLoading ? (
              <Loader2 className="animate-spin text-muted-foreground" />
            ) : darstellungen.length === 0 ? (
              <p className="text-muted-foreground">
                Noch keine Darstellung angelegt.{pflegen && " Unter „Pflege“ lässt sich der Ordner der Bibliothek aus SharePoint einlesen."}
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {darstellungen.map((d) => (
                  <li key={d.id}>
                    <DarstellungsEintrag
                      d={d}
                      themen={themen.filter((t) => t.presentation_id === d.id).length}
                      karten={karten.filter((k) => k.presentation_id === d.id).length}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(fragen.length > 0 || neu.length > 0) && (
            <div className="grid gap-8 md:grid-cols-2">
              {fragen.length > 0 && (
                <section>
                  <h2 className="mb-2 font-serif text-xl font-bold">Offene Fragen</h2>
                  <ul className="divide-y border-y">
                    {fragen.map(({ frage, thema }, i) => (
                      <li key={i} className="py-2">
                        <Link to={`/intern/bibliothek/thema/${thema.id}#offen`} className="line-clamp-2 hover:underline">{frage.replace(/[*_`]/g, "")}</Link>
                        <span className="text-xs text-muted-foreground">{thema.title}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {neu.length > 0 && (
                <section>
                  <h2 className="mb-2 font-serif text-xl font-bold">Zuletzt ergänzt</h2>
                  <ul className="divide-y border-y">
                    {neu.map((k) => (
                      <li key={k.id} className="py-2">
                        <Link to={`/intern/bibliothek/karte/${k.id}`} className="line-clamp-2 hover:underline">{k.statement}</Link>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-mono">{k.id}</span> · {datum(k.updated_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <section className="border-t pt-6">
            <h2 className="mb-3 font-serif text-xl font-bold">So belegen wir</h2>
            <dl className="grid gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr]">
              {(["Q", "F", "A"] as Stufe[]).map((s) => (
                <div key={s} className="contents">
                  <dt><StufeAbzeichen stufe={s} /></dt>
                  <dd className="text-sm"><strong>{STUFE[s].label}</strong> – {ERKLAERUNG[s]}</dd>
                </div>
              ))}
            </dl>
            <nav aria-label="Für alle Darstellungen" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {methode && (
                <Link to={`/intern/bibliothek/seite/${methode.slug}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <FileText size={15} aria-hidden /> {methode.title}
                </Link>
              )}
              <Link to="/intern/bibliothek/quellen" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Library size={15} aria-hidden /> Quellenregister
              </Link>
              {weitere.filter((s) => s !== methode).map((s) => (
                <Link key={s.slug} to={`/intern/bibliothek/seite/${s.slug}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <FileText size={15} aria-hidden /> {s.title}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      )}
    </Rahmen>
  );
}

/** Eine Darstellung als Eintrag: Bild (Feld `bild`), Epoche, Titel, wie weit sie ist. */
function DarstellungsEintrag({ d, themen, karten }: { d: Darstellung; themen: number; karten: number }) {
  const { data: bilder } = useBilder();
  const bild = d.image ? bilder?.get(d.image) : undefined;
  const adresse = useBildAdresse(bild ? d.image : null);
  const src = adresse?.preview ?? adresse?.full;
  return (
    <Link to={`/intern/bibliothek/${d.id}`} className="flex h-full overflow-hidden rounded-lg border bg-card hover:border-primary/50">
      {d.image && (
        <span className="w-28 shrink-0 bg-muted/40 sm:w-36">
          {src ? <img src={src} alt="" aria-hidden className="h-full w-full object-cover" loading="lazy" /> : <span className="block h-full w-full" />}
        </span>
      )}
      <span className="min-w-0 p-4">
        <span className="block text-xs text-muted-foreground">{[d.epoch, d.period].filter(Boolean).join(" · ")}</span>
        <span className="block font-semibold leading-snug">{d.title}</span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {themen ? `${themen} ${themen === 1 ? "Themenseite" : "Themenseiten"}` : "Themenseiten folgen"} · {karten} Karten
        </span>
      </span>
    </Link>
  );
}
