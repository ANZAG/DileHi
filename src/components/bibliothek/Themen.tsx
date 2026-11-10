import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CheckCheck, ChevronDown, ChevronRight, CircleDashed, ClipboardList, CornerDownRight, GitBranch, MinusCircle, UserRound } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KartenLink, StufeAbzeichen, Text } from "@/components/bibliothek/Bausteine";
import type { Darstellung, Tafel, Thema } from "@/hooks/useBibliothek";
import {
  DATIERUNG, KAPITEL_AUSRUESTUNG, KAPITEL_STATUS, LAGE, RAHMEN_STATUS, fuerRolle, nachGruppe, pfadZurEigenenEinheit, rahmenFuerRolle, rahmenStufe, themenBaum,
  zaehlen, zeitraumJahre, type BaumKnoten, type RahmenStatus, type RahmenZeile, type Stufe, type ThemaImBaum,
} from "@/lib/bibliothek";

// ── Zähltabelle ─────────────────────────────────────────────────────────────

/**
 * „Was sich in der Realität findet", gezählt: Merkmal × Lage über alle Tafeln,
 * die auf diese Seite zeigen. Nur belastbar datierte Tafeln zählen – ein Foto,
 * das nur der Stahlhelm auf „frühestens 1916" datiert, bestätigte sonst die
 * eigene Annahme.
 */
export function Zaehltabelle({ thema, tafeln, darstellung }: { thema: string; tafeln: Tafel[]; darstellung?: Darstellung }) {
  const zeitraum = zeitraumJahre(darstellung?.period);
  const [nurZeitraum, setNurZeitraum] = useState(!!zeitraum);
  const z = useMemo(
    () => zaehlen(tafeln, thema, nurZeitraum ? zeitraum : null),
    [tafeln, thema, nurZeitraum, zeitraum]
  );
  if (!z.gezaehlt.length && !z.nichtGezaehlt.length) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Datierte Fotos unserer Sammlung: {z.gezaehlt.length} {z.gezaehlt.length === 1 ? "Tafel" : "Tafeln"}</h3>
        {zeitraum && (
          <p className="text-xs text-muted-foreground" role="group" aria-label="Zeitraum der Zählung">
            <button type="button" aria-pressed={nurZeitraum} onClick={() => setNurZeitraum(true)}
              className={nurZeitraum ? "font-semibold text-foreground" : "underline underline-offset-2 hover:text-foreground"}>
              nur {zeitraum[0]}–{zeitraum[1]}
            </button>
            {" · "}
            <button type="button" aria-pressed={!nurZeitraum} onClick={() => setNurZeitraum(false)}
              className={!nurZeitraum ? "font-semibold text-foreground" : "underline underline-offset-2 hover:text-foreground"}>
              alle
            </button>
          </p>
        )}
      </div>

      {z.merkmale.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y text-left">
                <th className="py-1 pr-3 font-medium">Merkmal</th>
                {z.lagen.map((l) => <th key={l} className="px-2 py-1 text-right font-medium">{LAGE[l] ?? l}</th>)}
              </tr>
            </thead>
            <tbody>
              {z.merkmale.map((m) => (
                <tr key={m} className="border-b last:border-0">
                  <td className="py-1 pr-3">{m}</td>
                  {z.lagen.map((l) => (
                    <td key={l} className="px-2 py-1 text-right tabular-nums">{z.zellen.get(`${m}|${l}`) ?? <span className="text-muted-foreground">–</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Tafel in dieser Auswahl.</p>
      )}

      <p className="text-xs text-muted-foreground">
        Gezählt sind nur belastbar datierte Fotos unserer Sammlung; die Auswahl ist zufällig und nicht repräsentativ.
      </p>

      {z.nichtGezaehlt.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Nicht gezählt ({z.nichtGezaehlt.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {z.nichtGezaehlt.map(({ tafel, grund }) => (
              <li key={tafel.id}>
                <Link to={`/intern/bibliothek/tafel/${tafel.id}`} className="font-mono text-primary hover:underline">{tafel.id}</Link>{" "}
                {tafel.title} <span className="text-muted-foreground">– {grund}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Gliederungsbaum ─────────────────────────────────────────────────────────

/**
 * Der Gliederungsbaum einer Themenseite (Kapitel 5): von oben nach unten,
 * Kästen mit Stufe und Belegen, fremde Einheiten gestrichelt, die eigene
 * hervorgehoben. Oben offen, darunter zu – ausser auf dem Weg zur eigenen
 * Einheit.
 */
export function Gliederungsbaum({ baum }: { baum: BaumKnoten[] }) {
  const pfad = useMemo(() => pfadZurEigenenEinheit(baum), [baum]);
  const anfang = useMemo(() => new Set([...baum.map((k) => k.id), ...pfad]), [baum, pfad]);
  const alle = useMemo(() => {
    const ids: string[] = [];
    const gehen = (l: BaumKnoten[]) => l.forEach((k) => { ids.push(k.id); gehen(k.kinder ?? []); });
    gehen(baum);
    return ids;
  }, [baum]);
  const [offen, setOffen] = useState<Set<string>>(anfang);
  const umschalten = (id: string) =>
    setOffen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="my-4">
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOffen(new Set(alle))}>Alles aufklappen</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOffen(new Set(anfang))}>Wie am Anfang</Button>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block h-3 w-5 rounded-sm border-2 border-primary bg-primary/10" /> unsere Einheit
          <span className="ml-2 inline-block h-3 w-5 rounded-sm border border-dashed border-muted-foreground" /> nicht unser Verband
        </span>
      </div>
      <ul className="space-y-2">
        {baum.map((k) => <BaumZweig key={k.id} knoten={k} offen={offen} umschalten={umschalten} />)}
      </ul>
    </div>
  );
}

function BaumZweig({ knoten, offen, umschalten }: { knoten: BaumKnoten; offen: Set<string>; umschalten: (id: string) => void }) {
  const kinder = knoten.kinder ?? [];
  const auf = offen.has(knoten.id);
  const stufe = (["Q", "F", "A", "offen"].includes(String(knoten.stufe)) ? knoten.stufe : null) as Stufe | "offen" | null;
  return (
    <li>
      <div
        className={`rounded-lg p-3 ${
          knoten.darstellung ? "border-2 border-primary bg-primary/5"
            : knoten.fremd ? "border border-dashed border-muted-foreground/60 bg-muted/30"
              : "border bg-card"
        }`}
      >
        <div className="flex items-start gap-2">
          {kinder.length > 0 ? (
            <button type="button" onClick={() => umschalten(knoten.id)} aria-expanded={auf}
              aria-label={`${knoten.titel} ${auf ? "zuklappen" : "aufklappen"}`} className="mt-0.5 rounded p-0.5 hover:bg-muted">
              {auf ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : <span className="w-5 shrink-0" />}
          {stufe && <StufeAbzeichen stufe={stufe} />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">
              {knoten.titel}
              {knoten.darstellung && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">wir</span>}
            </p>
            {knoten.ebene && <p className="text-xs text-muted-foreground">{knoten.ebene}{knoten.fremd && " · nicht unser Verband"}</p>}
            {knoten.text && <p className="mt-1 text-sm">{knoten.text}</p>}
            {!!knoten.belege?.length && (
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs">
                {knoten.belege.map((b) => <KartenLink key={b} id={b} />)}
              </p>
            )}
            {kinder.length > 0 && !auf && (
              <button type="button" onClick={() => umschalten(knoten.id)} className="mt-1 text-xs text-muted-foreground hover:text-foreground">
                {kinder.length} darunter
              </button>
            )}
          </div>
        </div>
      </div>
      {auf && kinder.length > 0 && (
        <ul className="ml-2 mt-2 space-y-2 border-l pl-2 sm:ml-5 sm:pl-4">
          {kinder.map((k) => <BaumZweig key={k.id} knoten={k} offen={offen} umschalten={umschalten} />)}
        </ul>
      )}
    </li>
  );
}

// ── Kapitel und Themenseiten ────────────────────────────────────────────────

/** Die Themenseiten eines Kapitels als eingerückte Liste. */
export function ThemenListe({ knoten, rolle, kapitelMitRolle }: {
  knoten: ThemaImBaum<Thema>[];
  rolle: string | null;
  kapitelMitRolle: boolean;
}) {
  const sichtbar = knoten.filter((k) => !kapitelMitRolle || fuerRolle(k.thema.roles, rolle));
  if (!sichtbar.length) return null;
  return (
    <ul className="space-y-0.5">
      {sichtbar.map((k) => (
        <li key={k.thema.id}>
          <Link to={`/intern/bibliothek/thema/${k.thema.id}`} className="-mx-2 block rounded-md px-2 py-1.5 hover:bg-muted/60">
            <span className="font-medium">{k.thema.title}</span>
            {k.thema.summary && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{k.thema.summary}</span>}
          </Link>
          {k.kinder.length > 0 && (
            <div className="ml-1 border-l pl-3">
              <ThemenListe knoten={k.kinder} rolle={rolle} kapitelMitRolle={kapitelMitRolle} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Kapitel 1 bis 10 einer Darstellung: eine ruhige Liste, kein Kachelfeld. Je
 * Kapitel der Arbeitsstand in Worten und ein Satz, wenn Z0 einen gesetzt hat;
 * darunter die Themenseiten, nach Gruppen.
 */
export function Kapiteluebersicht({ kapitel, themen, rolle }: {
  kapitel: { nr: number; titel: string; status?: string; text?: string }[];
  themen: Thema[];
  rolle: string | null;
}) {
  return (
    <ol className="divide-y border-y">
      {kapitel.map((k) => {
        const baum = themenBaum(themen, k.nr);
        const mitRolle = k.nr === KAPITEL_AUSRUESTUNG;
        const nichtRelevant = k.status === "nicht-relevant";
        const sichtbar = baum.filter((b) => !mitRolle || fuerRolle(b.thema.roles, rolle));
        return (
          <li key={k.nr} id={`kapitel-${k.nr}`} className="grid scroll-mt-20 gap-x-6 gap-y-1 py-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <h3 className={`font-serif text-lg font-bold leading-snug ${nichtRelevant || !baum.length ? "text-muted-foreground" : ""}`}>
                <span className="mr-2 font-sans text-sm font-normal text-muted-foreground">{k.nr}</span>{k.titel}
              </h3>
              {k.status && KAPITEL_STATUS[k.status] && <p className="text-xs text-muted-foreground">{KAPITEL_STATUS[k.status]}</p>}
              {k.text && <p className="mt-1 text-sm text-muted-foreground">{k.text}</p>}
            </div>
            <div className="min-w-0">
              {nachGruppe(baum).map((g) => (
                <div key={g.gruppe ?? ""} className={g.gruppe ? "mt-3 first:mt-0" : ""}>
                  {g.gruppe && <h4 className="mb-0.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.gruppe}</h4>}
                  <ThemenListe knoten={g.knoten} rolle={rolle} kapitelMitRolle={mitRolle} />
                </div>
              ))}
              {mitRolle && rolle && baum.length > 0 && !sichtbar.length && (
                <p className="text-sm text-muted-foreground">Für diese Rolle keine Seite.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** „Ich stelle dar: …" mit Weg zur Prüfliste. */
export function RollenWahl({ darstellung, rolle, waehlen, mitPruefliste = true }: {
  darstellung: Darstellung;
  rolle: string | null;
  waehlen: (r: string | null) => void;
  mitPruefliste?: boolean;
}) {
  if (!darstellung.roles.length) return null;
  const KEINE = "__alle__";
  const gewaehlt = darstellung.roles.find((r) => r.id === rolle);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <UserRound size={16} className="text-muted-foreground" aria-hidden />
      <span className="text-sm">Ich stelle dar:</span>
      <Select value={rolle ?? KEINE} onValueChange={(v) => waehlen(v === KEINE ? null : v)}>
        <SelectTrigger className="h-8 w-48" aria-label="Rolle wählen"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={KEINE}>alle Rollen</SelectItem>
          {darstellung.roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.titel}</SelectItem>)}
        </SelectContent>
      </Select>
      {mitPruefliste && (
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link to={`/intern/bibliothek/${darstellung.id}/pruefliste`}>
            <ClipboardList size={15} className="mr-1" /> Prüfliste
          </Link>
        </Button>
      )}
      {gewaehlt?.text && <p className="basis-full text-xs text-muted-foreground">{gewaehlt.text}</p>}
      {rolle && <p className="basis-full text-xs text-muted-foreground">Kapitel 8 zeigt nur, was für diese Rolle gilt.</p>}
    </div>
  );
}

/** Unterseiten einer Themenseite. */
export function Unterseiten({ themen, id, rolle, mitRolle }: { themen: Thema[]; id: string; rolle: string | null; mitRolle: boolean }) {
  const kinder = themen
    .filter((t) => t.parent_id === id && (!mitRolle || fuerRolle(t.roles, rolle)))
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "de"));
  if (!kinder.length) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-serif text-xl font-bold">Unterseiten</h2>
      <ul className="divide-y rounded-lg border bg-card">
        {kinder.map((t) => (
          <li key={t.id}>
            <Link to={`/intern/bibliothek/thema/${t.id}`} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/60">
              <CornerDownRight size={15} className="mt-1 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{t.title}</span>
                {t.summary && <span className="block text-xs text-muted-foreground line-clamp-2">{t.summary}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const datierungText = (t: Pick<Tafel, "year" | "dating_origin">) =>
  [t.year, t.dating_origin ? `aus ${DATIERUNG[t.dating_origin] ?? t.dating_origin}` : null].filter(Boolean).join(" ");

// ── Darstellungsrahmen ─────────────────────────────────────────────────────

const STATUS_ICON: Record<RahmenStatus, typeof Check> = {
  pflicht: CheckCheck,
  bevorzugt: Check,
  variante: GitBranch,
  offen: CircleDashed,
  "nicht-empfohlen": MinusCircle,
};

/** Status einer Zeile: Wort mit kleinem Zeichen, keine Farbfläche. */
export function RahmenStatusText({ status }: { status: RahmenStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${RAHMEN_STATUS[status].farbe}`}>
      <Icon size={15} aria-hidden /> {RAHMEN_STATUS[status].label}
    </span>
  );
}

/**
 * „Unsere Darstellung" als Tabelle: Lage, Gegenstand, Status, Stufe. Varianten
 * stehen gleichrangig neben dem Bevorzugten – sie sind zulässig, keine Fehler.
 */
export function RahmenTabelle({ rahmen, rolle, stufeVon }: {
  rahmen: RahmenZeile[];
  rolle: string | null;
  stufeVon: (karte: string) => Stufe | null | undefined;
}) {
  const zeilen = rahmenFuerRolle(rahmen, rolle);
  const ausgeblendet = rahmen.length - zeilen.length;
  return (
    <div>
      <ul className="divide-y border-y">
        {zeilen.map((z, i) => {
          const stufe = rahmenStufe(z, stufeVon);
          return (
            <li key={i} className="grid gap-x-5 gap-y-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <span className="text-sm text-muted-foreground sm:pt-0.5">{z.lage ?? ""}</span>
              <span className="min-w-0">
                <span className="block font-semibold">{z.gegenstand}</span>
                {z.text && <Text inhalt={z.text} className="text-sm prose-p:my-0" />}
                {!!z.karten?.length && (
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs">{z.karten.map((k) => <KartenLink key={k} id={k} />)}</span>
                )}
              </span>
              <span className="flex items-center gap-2 sm:justify-end sm:self-start sm:pt-0.5">
                <RahmenStatusText status={z.status} />
                {stufe && <StufeAbzeichen stufe={stufe} />}
              </span>
            </li>
          );
        })}
      </ul>
      {ausgeblendet > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{ausgeblendet} {ausgeblendet === 1 ? "Zeile gilt" : "Zeilen gelten"} nur für andere Rollen.</p>
      )}
    </div>
  );
}
