import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Info, Loader2 } from "lucide-react";
import { KartenZeile, Rahmen, Text } from "@/components/bibliothek/Bausteine";
import { Gliederungsbaum, RahmenTabelle, Unterseiten, Zaehltabelle, datierungText } from "@/components/bibliothek/Themen";
import {
  useDarstellungen, useGewaehlteRolle, useKarten, useTafeln, useThemen, type Karte, type Thema,
} from "@/hooks/useBibliothek";
import {
  KAPITEL_AUSRUESTUNG, LAGE, STUFE, abschnitte, fuerRolle, kapitelDer, offeneFragen, type Abschnitt, type Stufe,
} from "@/lib/bibliothek";

const datum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-DE") : null);

/** Die Kette der Elternseiten, von oben nach unten. Ein Kreis bricht ab. */
function elternKette(themen: Thema[], t: Thema): Thema[] {
  const kette: Thema[] = [];
  let id = t.parent_id;
  while (id && kette.length < 10) {
    const e = themen.find((x) => x.id === id);
    if (!e || kette.includes(e) || e.id === t.id) break;
    kette.unshift(e);
    id = e.parent_id;
  }
  return kette;
}

/**
 * Eine Themenseite. Reihenfolge nach Z0 und Copilot: erst die Antwort
 * (Kurzantwort, der eingeklappte Hintergrund, unsere Darstellung), dann die
 * Erklärung (Quellen), dann der Befund, dann was offen ist und die Belege.
 *
 * Kästen nur dort, wo etwas für sich steht: Kurzantwort, unsere Darstellung,
 * jede offene Frage, die Belegliste. Alles andere ist ruhiger Text.
 */
export default function BibliothekThema() {
  const { id } = useParams();
  const { data: themen = [], isLoading } = useThemen();
  const { data: darstellungen = [] } = useDarstellungen();
  const { data: karten = [] } = useKarten();
  const { data: tafeln = [] } = useTafeln();
  const thema = themen.find((t) => t.id === id);
  const [rolle] = useGewaehlteRolle(thema?.presentation_id);
  const { hash } = useLocation();

  // Ein Sprung zu „#offen" (von der Startseite) kommt vor den Daten an.
  useEffect(() => {
    if (!hash || !thema) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
    return () => clearTimeout(t);
  }, [hash, thema]);
  const [stufenFilter, setStufenFilter] = useState<Stufe | null>(null);
  const stufeVon = useMemo(() => {
    const m = new Map(karten.map((k) => [k.id, k.grade]));
    return (k: string) => m.get(k);
  }, [karten]);

  const krumen = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }];
  if (isLoading) return <Rahmen krumen={krumen} titel="Themenseite"><Loader2 className="animate-spin" /></Rahmen>;
  if (!thema) {
    return (
      <Rahmen krumen={krumen} titel="Themenseite nicht gefunden">
        <p className="text-muted-foreground">Eine Themenseite „{id}“ gibt es nicht – vielleicht liegt sie noch im Entwurfsordner.</p>
      </Rahmen>
    );
  }

  const d = darstellungen.find((x) => x.id === thema.presentation_id);
  const kapitel = kapitelDer(d?.chapters).find((k) => k.nr === thema.chapter);
  const kette = elternKette(themen, thema);
  const mitRolle = thema.chapter === KAPITEL_AUSRUESTUNG;
  const rollenName = (r: string) => d?.roles.find((x) => x.id === r)?.titel ?? r;

  const teile = abschnitte(thema.body);
  const teil = (name: Abschnitt["name"]) => teile.find((a) => a.name === name)?.text || null;
  const kurz = teil("Kurzantwort");
  const hintergrund = teil("Historischer Hintergrund");
  const darstellungText = teil("Unsere Darstellung");
  const quellen = teil("Quellen");
  const befund = teil("Befund");
  const offen = teil("Offen");
  const uebrige = teile.filter((a) => !a.name && (a.titel || a.text));
  const zeigtHier = tafeln.filter((t) => t.shows.some((z) => z.thema === thema.id));
  const rahmen = thema.frame ?? [];

  // Belege: erst in der Reihenfolge von `karten`, dann die, die über `thema` zeigen.
  const genannt = thema.cards.map((c) => karten.find((k) => k.id === c)).filter((k): k is Karte => !!k);
  const zeigend = karten.filter((k) => k.topics.includes(thema.id) && !thema.cards.includes(k.id));
  const sichtbar = (l: Karte[]) => (mitRolle ? l.filter((k) => fuerRolle(k.roles, rolle)) : l);
  const alleBelege = [...sichtbar(genannt), ...sichtbar(zeigend)];
  const gefiltert = (l: Karte[]) => (stufenFilter ? l.filter((k) => k.grade === stufenFilter) : l);
  const zaehl = (s: Stufe) => alleBelege.filter((k) => k.grade === s).length;
  const tafelIds = [...new Set([...thema.plates, ...zeigtHier.map((t) => t.id)])];
  const tafelListe = tafelIds.map((t) => tafeln.find((x) => x.id === t)).filter((t): t is NonNullable<typeof t> => !!t);

  const navigation = [
    kurz && ["kurz", "Kurzantwort"],
    (rahmen.length || darstellungText) && ["darstellung", "Unsere Darstellung"],
    quellen && ["quellen", "Quellen"],
    (befund || zeigtHier.length) && ["befund", "Befund"],
    offen && ["offen", "Offen"],
    alleBelege.length && ["belege", "Belege"],
  ].filter(Boolean) as [string, string][];

  const h2 = "font-serif text-2xl font-bold leading-tight";

  return (
    <Rahmen
      krumen={[
        ...krumen,
        { label: thema.presentation_id, to: `/intern/bibliothek/${thema.presentation_id}` },
        { label: `${thema.chapter} ${kapitel?.titel ?? ""}`.trim(), to: `/intern/bibliothek/${thema.presentation_id}#kapitel-${thema.chapter}` },
        ...kette.map((e) => ({ label: e.title, to: `/intern/bibliothek/thema/${e.id}` })),
        { label: thema.title },
      ]}
      titel={thema.title}
      untertitel={[
        `Kapitel ${thema.chapter}${kapitel ? ` · ${kapitel.titel}` : ""}`,
        thema.grp,
        mitRolle && thema.roles.length ? `gilt für ${thema.roles.map(rollenName).join(", ")}` : null,
      ].filter(Boolean).join(" · ")}
    >
      {navigation.length > 2 && (
        <nav aria-label="Abschnitte" className="sticky top-0 z-10 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b bg-background px-4 text-sm">
          {navigation.map(([anker, label]) => (
            <a key={anker} href={`#${anker}`} className="whitespace-nowrap px-2 py-2 text-muted-foreground hover:text-foreground">{label}</a>
          ))}
        </nav>
      )}

      <div className="max-w-[48rem] space-y-10">
        {mitRolle && rolle && !fuerRolle(thema.roles, rolle) && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info size={15} /> Diese Seite gilt nicht für „{rollenName(rolle)}“.
          </p>
        )}

        {(kurz || hintergrund) && (
          <div className="space-y-3">
            {kurz && (
              <section id="kurz" aria-label="Kurzantwort" className="scroll-mt-14 rounded-lg border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kurzantwort</p>
                <Text inhalt={kurz} className="mt-1 max-w-none text-[1.0625rem] leading-relaxed" />
              </section>
            )}
            {hintergrund && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <ChevronRight size={16} className="transition-transform group-open:rotate-90" aria-hidden />
                  Historischer Hintergrund
                </summary>
                <Text inhalt={hintergrund} className="mt-2 pl-6" />
              </details>
            )}
          </div>
        )}

        {!!thema.tree?.length && (
          <section aria-labelledby="gliederung">
            <h2 id="gliederung" className={h2}>Gliederung</h2>
            <Gliederungsbaum baum={thema.tree} />
          </section>
        )}

        {(rahmen.length > 0 || darstellungText) && (
          <section id="darstellung" aria-labelledby="darstellung-t" className="scroll-mt-14 rounded-lg border border-foreground/20 bg-background p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="darstellung-t" className={h2}>Unsere Darstellung</h2>
              {mitRolle && (
                <Link to={`/intern/bibliothek/${thema.presentation_id}/pruefliste`} className="text-sm font-semibold text-primary hover:underline">
                  In der Prüfliste →
                </Link>
              )}
            </div>
            {rahmen.length > 0 && <RahmenTabelle rahmen={rahmen} rolle={mitRolle ? rolle : null} stufeVon={stufeVon} />}
            {darstellungText && <Text inhalt={darstellungText} className={rahmen.length ? "mt-3" : ""} />}
          </section>
        )}

        {quellen && (
          <section id="quellen" aria-labelledby="quellen-t" className="scroll-mt-14">
            <h2 id="quellen-t" className={h2}>Quellen</h2>
            <Text inhalt={quellen} className="mt-2" />
          </section>
        )}

        {(befund || zeigtHier.length > 0) && (
          <section id="befund" aria-labelledby="befund-t" className="scroll-mt-14">
            <h2 id="befund-t" className={h2}>Befund</h2>
            {zeigtHier.length > 0 && <Zaehltabelle thema={thema.id} tafeln={tafeln} darstellung={d} />}
            <Text inhalt={befund} className="mt-2" />
          </section>
        )}

        {uebrige.map((a, i) => (
          <section key={`u-${i}`}>
            {a.titel && <h2 className={h2}>{a.titel}</h2>}
            <Text inhalt={a.text} className="mt-2" />
          </section>
        ))}

        {offen && (
          <section id="offen" aria-labelledby="offen-t" className="scroll-mt-14">
            <h2 id="offen-t" className={h2}>Offen</h2>
            <ul className="mt-3 space-y-2">
              {offeneFragen(offen).map((f, i) => (
                <li key={i} className="rounded-lg border bg-card px-4 py-3"><Text inhalt={f} className="max-w-none prose-p:my-0" /></li>
              ))}
            </ul>
          </section>
        )}

        <Unterseiten themen={themen} id={thema.id} rolle={rolle} mitRolle={mitRolle} />

        {(alleBelege.length > 0 || tafelListe.length > 0) && (
          <section id="belege" aria-labelledby="belege-t" className="scroll-mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="belege-t" className={h2}>Belege</h2>
              {alleBelege.length > 0 && (
                <p className="text-sm text-muted-foreground" role="group" aria-label="Nach Belegstufe filtern">
                  {[null, "Q", "F", "A"].filter((s) => !s || zaehl(s as Stufe)).map((s, i) => (
                    <span key={s ?? "alle"}>
                      {i > 0 && " · "}
                      <button
                        type="button"
                        aria-pressed={stufenFilter === s}
                        onClick={() => setStufenFilter(s as Stufe | null)}
                        title={s ? STUFE[s as Stufe].label : undefined}
                        className={stufenFilter === s ? "font-semibold text-foreground" : "underline underline-offset-2 hover:text-foreground"}
                      >
                        {s ? `${s} ${zaehl(s as Stufe)}` : `Alle ${alleBelege.length}`}
                      </button>
                    </span>
                  ))}
                </p>
              )}
            </div>
            {gefiltert(sichtbar(genannt)).length > 0 && (
              <ul className="mt-3 divide-y rounded-lg border bg-card">{gefiltert(sichtbar(genannt)).map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
            )}
            {gefiltert(sichtbar(zeigend)).length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-sm font-semibold text-muted-foreground">Weitere Karten zu diesem Thema</h3>
                <ul className="divide-y rounded-lg border bg-card">{gefiltert(sichtbar(zeigend)).map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
              </>
            )}
            {thema.cards.length > genannt.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                Noch nicht in der Bibliothek: {thema.cards.filter((c) => !karten.some((k) => k.id === c)).join(", ")}
              </p>
            )}
            {tafelListe.length > 0 && (
              <>
                <h3 className="mb-1 mt-5 text-sm font-semibold text-muted-foreground">Bildtafeln</h3>
                <ul className="divide-y border-y text-sm">
                  {tafelListe.map((t) => (
                    <li key={t.id}>
                      <Link to={`/intern/bibliothek/tafel/${t.id}`} className="block py-2 hover:bg-muted/60">
                        <span className="block">{t.title}</span>
                        <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {datierungText(t) && <span>{datierungText(t)}</span>}
                          {t.situation && <span>{LAGE[t.situation] ?? t.situation}</span>}
                          <span className="font-mono opacity-70">{t.id}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4 text-sm">
          <Link to={`/intern/bibliothek/${thema.presentation_id}#kapitel-${thema.chapter}`} className="text-primary hover:underline">
            ↑ Kapitel {thema.chapter}{kapitel ? ` · ${kapitel.titel}` : ""}
          </Link>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{thema.id}</span>{thema.as_of && <> · Stand {datum(thema.as_of)}</>}
          </span>
        </div>
      </div>
    </Rahmen>
  );
}
