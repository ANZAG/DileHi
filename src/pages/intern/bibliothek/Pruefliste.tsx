import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Check, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KartenLink, Rahmen, StufeAbzeichen, Text } from "@/components/bibliothek/Bausteine";
import { RahmenStatusText, RollenWahl } from "@/components/bibliothek/Themen";
import { useDarstellungen, useGewaehlteRolle, useKarten, useThemen } from "@/hooks/useBibliothek";
import {
  KAPITEL_AUSRUESTUNG, abschnitt, fuerRolle, inReihenfolge, kapitelDer, rahmenFuerRolle, rahmenStufe, themenBaum,
  type RahmenZeile, type Stufe,
} from "@/lib/bibliothek";

/**
 * Prüfliste für eine Rolle: alle Themenseiten aus Kapitel 8 in ihrer
 * Reihenfolge. Hat eine Seite einen Darstellungsrahmen, wird jede Zeile ein
 * Punkt zum Abhaken; „nicht empfohlen" steht als Warnung ohne Häkchen da.
 * Seiten ohne Rahmen erscheinen mit Kurzantwort und „Unsere Darstellung".
 *
 * Abgehakt wird nur auf diesem Gerät (Z0, E4) – die Liste ist ein
 * Werkzeug für den Moment vor der Veranstaltung, kein Protokoll.
 */

const speicherSchluessel = (darstellung: string, rolle: string | null) => `bibliothek-pruefliste-${darstellung}-${rolle ?? "alle"}`;

function abgehaktLesen(schluessel: string): Set<string> {
  try {
    const roh = localStorage.getItem(schluessel);
    return new Set(roh ? (JSON.parse(roh) as string[]) : []);
  } catch {
    return new Set();
  }
}

function useAbgehakt(schluessel: string): [Set<string>, (punkt: string) => void, () => void] {
  const [abgehakt, setAbgehakt] = useState<Set<string>>(() => abgehaktLesen(schluessel));
  useEffect(() => setAbgehakt(abgehaktLesen(schluessel)), [schluessel]);
  const speichern = (neu: Set<string>) => {
    setAbgehakt(neu);
    try {
      if (neu.size) localStorage.setItem(schluessel, JSON.stringify([...neu]));
      else localStorage.removeItem(schluessel);
    } catch {
      // Ohne Speicher gilt das Häkchen nur, solange die Seite offen ist.
    }
  };
  const umschalten = (punkt: string) => {
    const neu = new Set(abgehakt);
    if (neu.has(punkt)) neu.delete(punkt);
    else neu.add(punkt);
    speichern(neu);
  };
  return [abgehakt, umschalten, () => speichern(new Set())];
}

/** Der Schlüssel eines Punktes: Seite und Gegenstand, damit Häkchen ein Umsortieren überstehen. */
const punktVon = (thema: string, zeile?: RahmenZeile) => (zeile ? `${thema}#${zeile.gegenstand}` : thema);

export default function BibliothekPruefliste() {
  const { darstellung: id } = useParams();
  const { data: darstellungen = [], isLoading } = useDarstellungen();
  const { data: themen = [] } = useThemen();
  const { data: karten = [] } = useKarten(id);
  const [rolle, waehlen] = useGewaehlteRolle(id);
  const [nurOffen, setNurOffen] = useState(false);
  const [abgehakt, umschalten, zuruecksetzen] = useAbgehakt(speicherSchluessel(id ?? "", rolle));
  const stufeVon = useMemo(() => {
    const m = new Map(karten.map((k) => [k.id, k.grade]));
    return (k: string): Stufe | undefined => m.get(k);
  }, [karten]);

  const d = darstellungen.find((x) => x.id === id);
  const krumen = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }];

  if (isLoading) return <Rahmen krumen={krumen} titel="Prüfliste"><Loader2 className="animate-spin" /></Rahmen>;
  if (!d) return <Rahmen krumen={krumen} titel="Darstellung nicht gefunden"><p className="text-muted-foreground">Eine Darstellung „{id}“ gibt es nicht.</p></Rahmen>;

  const kapitel = kapitelDer(d.chapters).find((k) => k.nr === KAPITEL_AUSRUESTUNG);
  const seiten = inReihenfolge(themenBaum(themen.filter((t) => t.presentation_id === d.id), KAPITEL_AUSRUESTUNG))
    .filter((t) => fuerRolle(t.roles, rolle))
    .map((t) => ({ thema: t, zeilen: rahmenFuerRolle(t.frame, rolle) }));
  const rollenName = d.roles.find((r) => r.id === rolle)?.titel ?? "alle Rollen";
  const heute = new Date().toLocaleDateString("de-DE");

  // Was sich abhaken lässt: jede Zeile ausser „nicht empfohlen", bei Seiten ohne Rahmen die Seite selbst.
  const punkte = seiten.flatMap(({ thema, zeilen }) =>
    zeilen.length ? zeilen.filter((z) => z.status !== "nicht-empfohlen").map((z) => punktVon(thema.id, z)) : [punktVon(thema.id)]
  );
  const erledigt = punkte.filter((p) => abgehakt.has(p)).length;

  return (
    <Rahmen
      krumen={[...krumen, { label: d.id, to: `/intern/bibliothek/${d.id}` }, { label: "Prüfliste" }]}
      titel={`Prüfliste: ${rollenName}`}
      untertitel={`${d.title} · Kapitel ${KAPITEL_AUSRUESTUNG} ${kapitel?.titel ?? ""}`}
      aktion={<Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden"><Printer size={15} className="mr-1" /> Drucken</Button>}
    >
      {/* Beim Drucken nur die Liste: Kopf, Fuss und Navigation der Seite weg. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 15mm 18mm; }
          body * { visibility: hidden !important; }
          #pruefliste, #pruefliste * { visibility: visible !important; }
          #pruefliste { position: absolute; left: 0; top: 0; width: 100%; }
          #pruefliste section, #pruefliste li { break-inside: avoid; }
        }
      `}</style>

      <div className="mb-5 print:hidden">
        <RollenWahl darstellung={d} rolle={rolle} waehlen={waehlen} mitPruefliste={false} />
      </div>

      {punkte.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 text-sm backdrop-blur print:hidden">
          <span className="font-semibold">{erledigt} von {punkte.length} abgehakt</span>
          <span className="text-muted-foreground">
            <button type="button" onClick={() => setNurOffen(false)} className={!nurOffen ? "font-semibold text-foreground" : "hover:underline"} aria-pressed={!nurOffen}>Alle</button>
            {" · "}
            <button type="button" onClick={() => setNurOffen(true)} className={nurOffen ? "font-semibold text-foreground" : "hover:underline"} aria-pressed={nurOffen}>Noch offen</button>
          </span>
          {erledigt > 0 && (
            <button type="button" onClick={zuruecksetzen} className="ml-auto text-muted-foreground hover:underline">Häkchen zurücksetzen</button>
          )}
          <span className="basis-full text-xs text-muted-foreground">Häkchen bleiben nur auf diesem Gerät.</span>
        </div>
      )}

      <div id="pruefliste">
        <header className="mb-4 hidden print:block">
          <h1 className="text-xl font-bold">Prüfliste {rollenName} – {d.title}</h1>
          <p className="text-xs">Kapitel {KAPITEL_AUSRUESTUNG} {kapitel?.titel} · gedruckt {heute} · Wissensbibliothek, nur für den Verein</p>
        </header>
        {seiten.length === 0 ? (
          <p className="text-muted-foreground">In Kapitel {KAPITEL_AUSRUESTUNG} gibt es für diese Auswahl noch keine Themenseite.</p>
        ) : (
          <ol className="space-y-6">
            {seiten.map(({ thema: t, zeilen }, i) => {
              const sichtbar = nurOffen
                ? zeilen.filter((z) => z.status === "nicht-empfohlen" || !abgehakt.has(punktVon(t.id, z)))
                : zeilen;
              const ohneRahmen = zeilen.length === 0;
              if (nurOffen && (ohneRahmen ? abgehakt.has(punktVon(t.id)) : !sichtbar.some((z) => z.status !== "nicht-empfohlen"))) return null;
              return (
                <li key={t.id}>
                  <section>
                    <h2 className="mb-2 font-serif text-lg font-bold">
                      <Link to={`/intern/bibliothek/thema/${t.id}`} className="hover:underline">{i + 1}. {t.title}</Link>
                    </h2>
                    {ohneRahmen ? (
                      <SeiteOhneRahmen body={t.body} summary={t.summary} erledigt={abgehakt.has(punktVon(t.id))} umschalten={() => umschalten(punktVon(t.id))} />
                    ) : (
                      <ul className="divide-y rounded-lg border bg-card print:rounded-none print:border-x-0">
                        {sichtbar.map((z) => (
                          <Punkt
                            key={z.gegenstand}
                            zeile={z}
                            stufe={rahmenStufe(z, stufeVon)}
                            erledigt={abgehakt.has(punktVon(t.id, z))}
                            umschalten={() => umschalten(punktVon(t.id, z))}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Rahmen>
  );
}

/** Das Kästchen – als Knopf, damit es auf dem Telefon gross genug ist und gedruckt leer bleibt. */
function Kaestchen({ erledigt, umschalten, beschriftung }: { erledigt: boolean; umschalten: () => void; beschriftung: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={erledigt}
      aria-label={beschriftung}
      onClick={umschalten}
      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
        erledigt ? "border-primary bg-primary text-primary-foreground" : "border-foreground/60"
      } print:border-foreground print:bg-transparent`}
    >
      {erledigt && <Check size={16} strokeWidth={3} className="print:hidden" aria-hidden />}
    </button>
  );
}

function Punkt({ zeile: z, stufe, erledigt, umschalten }: {
  zeile: RahmenZeile;
  stufe: Stufe | null;
  erledigt: boolean;
  umschalten: () => void;
}) {
  const warnung = z.status === "nicht-empfohlen";
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      {warnung ? (
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-800" aria-label="Nicht empfohlen" />
      ) : (
        <Kaestchen erledigt={erledigt} umschalten={umschalten} beschriftung={z.gegenstand} />
      )}
      <div className={`min-w-0 flex-1 ${erledigt ? "text-muted-foreground" : ""}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={`font-semibold ${erledigt ? "line-through decoration-1" : ""}`}>
            {z.lage && <span className="font-normal text-muted-foreground">{z.lage}: </span>}
            {z.gegenstand}
          </span>
          <span className="flex items-center gap-2">
            <RahmenStatusText status={z.status} />
            {stufe && <StufeAbzeichen stufe={stufe} />}
          </span>
        </div>
        {z.text && <Text inhalt={z.text} className="max-w-none text-sm prose-p:my-0" />}
        {!!z.karten?.length && (
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs print:hidden">{z.karten.map((k) => <KartenLink key={k} id={k} />)}</span>
        )}
      </div>
    </li>
  );
}

function SeiteOhneRahmen({ body, summary, erledigt, umschalten }: {
  body: string | null;
  summary: string | null;
  erledigt: boolean;
  umschalten: () => void;
}) {
  const kurz = abschnitt(body, "Kurzantwort") ?? summary;
  const soll = abschnitt(body, "Unsere Darstellung");
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-3 py-3 print:rounded-none print:border-x-0">
      <Kaestchen erledigt={erledigt} umschalten={umschalten} beschriftung="Seite abgehakt" />
      <div className={`min-w-0 flex-1 ${erledigt ? "text-muted-foreground" : ""}`}>
        {kurz && <Text inhalt={kurz} className="max-w-none" />}
        {soll && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Unsere Darstellung</p>
            <Text inhalt={soll} className="max-w-none" />
          </div>
        )}
        {!kurz && !soll && <p className="text-sm text-muted-foreground">Für diese Seite steht noch nichts fest.</p>}
      </div>
    </div>
  );
}
