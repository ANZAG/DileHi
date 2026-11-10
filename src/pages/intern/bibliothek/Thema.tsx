import { Link, useParams } from "react-router-dom";
import { Info, Loader2, UserRound } from "lucide-react";
import { KartenZeile, Rahmen, Text } from "@/components/bibliothek/Bausteine";
import { Gliederungsbaum, Unterseiten, Zaehltabelle, datierungText } from "@/components/bibliothek/Themen";
import {
  useDarstellungen, useGewaehlteRolle, useKarten, useTafeln, useThemen, type Thema,
} from "@/hooks/useBibliothek";
import { ABSCHNITTE, KAPITEL_AUSRUESTUNG, LAGE, abschnitte, fuerRolle, kapitelDer } from "@/lib/bibliothek";

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
 * Eine Themenseite: oben die Kurzantwort für den Besucher, dann die vier
 * übrigen Abschnitte in fester Reihenfolge, unter „Was sich in der Realität
 * findet" die Zählung über die Tafeln. Darunter die Belege – erst die Karten,
 * die die Seite nennt, dann die, die auf sie zeigen, dann die Tafeln.
 */
export default function BibliothekThema() {
  const { id } = useParams();
  const { data: themen = [], isLoading } = useThemen();
  const { data: darstellungen = [] } = useDarstellungen();
  const { data: karten = [] } = useKarten();
  const { data: tafeln = [] } = useTafeln();
  const thema = themen.find((t) => t.id === id);
  const [rolle] = useGewaehlteRolle(thema?.presentation_id);

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
  const kurz = teile.find((a) => a.titel === "Kurzantwort");
  const fest = ABSCHNITTE.slice(1).map((titel) => teile.find((a) => a.titel === titel) ?? { titel, text: "" });
  const uebrige = teile.filter((a) => !(ABSCHNITTE as readonly string[]).includes(a.titel));
  const zeigtHier = tafeln.filter((t) => t.shows.some((z) => z.thema === thema.id));

  // Belege: erst in der Reihenfolge von `karten`, dann die, die über `thema` zeigen.
  const genannt = thema.cards.map((c) => karten.find((k) => k.id === c)).filter((k): k is NonNullable<typeof k> => !!k);
  const zeigend = karten.filter((k) => k.topics.includes(thema.id) && !thema.cards.includes(k.id));
  const sichtbar = <T extends { roles: string[] }>(l: T[]) => (mitRolle ? l.filter((k) => fuerRolle(k.roles, rolle)) : l);
  const tafelIds = [...new Set([...thema.plates, ...zeigtHier.map((t) => t.id)])];
  const tafelListe = tafelIds.map((t) => tafeln.find((x) => x.id === t)).filter((t): t is NonNullable<typeof t> => !!t);

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
      untertitel={<span>Kapitel {thema.chapter}{kapitel ? ` · ${kapitel.titel}` : ""}</span>}
    >
      {mitRolle && thema.roles.length > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
          <UserRound size={15} className="text-muted-foreground" aria-hidden />
          Gilt für: {thema.roles.map((r) => (
            <span key={r} className={`rounded px-1.5 py-0.5 text-xs ${r === rolle ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{rollenName(r)}</span>
          ))}
        </p>
      )}
      {mitRolle && rolle && !fuerRolle(thema.roles, rolle) && (
        <p className="mb-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
          <Info size={15} /> Diese Seite gilt nicht für „{rollenName(rolle)}“.
        </p>
      )}

      {kurz?.text && (
        <section aria-label="Kurzantwort" className="mb-6 rounded-lg border-l-4 border-primary bg-primary/5 p-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Kurzantwort</h2>
          <Text inhalt={kurz.text} className="prose-base text-[1.0625rem] leading-relaxed" />
        </section>
      )}

      {!!thema.tree?.length && (
        <section className="mb-6">
          <h2 className="font-serif text-xl font-bold">Gliederung</h2>
          <Gliederungsbaum baum={thema.tree} />
        </section>
      )}

      {fest.map((a) => {
        const zaehlung = a.titel === "Was sich in der Realität findet" && zeigtHier.length > 0;
        if (!a.text && !zaehlung) return null;
        return (
          <section key={a.titel} className="mb-6">
            <h2 className="mb-1 font-serif text-xl font-bold">{a.titel}</h2>
            {zaehlung && <Zaehltabelle thema={thema.id} tafeln={tafeln} darstellung={d} />}
            <Text inhalt={a.text} />
          </section>
        );
      })}
      {uebrige.map((a, i) => (
        <section key={`u-${i}`} className="mb-6">
          {a.titel && <h2 className="mb-1 font-serif text-xl font-bold">{a.titel}</h2>}
          <Text inhalt={a.text} />
        </section>
      ))}

      <Unterseiten themen={themen} id={thema.id} rolle={rolle} mitRolle={mitRolle} />

      <section className="mb-6">
        <h2 className="mb-2 font-serif text-xl font-bold">Belege</h2>
        {sichtbar(genannt).length + sichtbar(zeigend).length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Karte.</p>
        ) : (
          <>
            {sichtbar(genannt).length > 0 && (
              <ul className="divide-y rounded-lg border bg-card">{sichtbar(genannt).map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
            )}
            {sichtbar(zeigend).length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-sm font-semibold text-muted-foreground">Weitere Karten zu diesem Thema</h3>
                <ul className="divide-y rounded-lg border bg-card">{sichtbar(zeigend).map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
              </>
            )}
          </>
        )}
        {thema.cards.length > genannt.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Noch nicht in der Bibliothek: {thema.cards.filter((c) => !karten.some((k) => k.id === c)).join(", ")}
          </p>
        )}

        {tafelListe.length > 0 && (
          <>
            <h3 className="mb-1 mt-4 text-sm font-semibold text-muted-foreground">Bildtafeln</h3>
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {tafelListe.map((t) => (
                <li key={t.id}>
                  <Link to={`/intern/bibliothek/tafel/${t.id}`} className="block px-3 py-2 hover:bg-muted/60">
                    <span className="block">{t.title}</span>
                    <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{t.id}</span>
                      {datierungText(t) && <span>{datierungText(t)}</span>}
                      {t.situation && <span>{LAGE[t.situation] ?? t.situation}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        <span className="font-mono">{thema.id}</span>
        {thema.as_of && <> · Stand {datum(thema.as_of)}</>} · zuletzt geändert {datum(thema.updated_at)}
      </p>
    </Rahmen>
  );
}
