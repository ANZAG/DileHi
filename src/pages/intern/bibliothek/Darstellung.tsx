import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { KartenZeile, Rahmen, RechteAbzeichen, StatusAbzeichen, Text } from "@/components/bibliothek/Bausteine";
import { Kapiteluebersicht, RollenWahl, datierungText } from "@/components/bibliothek/Themen";
import {
  useDarstellungen, useGewaehlteRolle, useKarten, useQuellen, useTafeln, useThemen, useVerweise,
  type Darstellung, type Karte,
} from "@/hooks/useBibliothek";
import { BEREICHE, LAGE, abschnitt, fuerRolle, kapitelDer, type Stufe } from "@/lib/bibliothek";

const REITER = [
  { id: "themen", label: "Themen" },
  { id: "belege", label: "Belege" },
  { id: "tafeln", label: "Bildtafeln" },
  { id: "quellen", label: "Quellen" },
  { id: "offen", label: "Offen" },
] as const;
type Reiter = (typeof REITER)[number]["id"];

/**
 * Eine Darstellung. Der Einstieg sind die zehn Kapitel mit ihren
 * Themenseiten; daneben die Belege nach Sachbereich (wie früher die ganze
 * Seite), die Bildtafeln, die zitierten Quellen und was offen ist.
 *
 * Der Reiter steht in der Adresse, damit „Zurück" von einer Karte wieder bei
 * den Belegen landet und nicht bei den Kapiteln.
 */
export default function BibliothekDarstellung() {
  const { darstellung: id } = useParams();
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const reiter = (REITER.some((r) => r.id === params.get("reiter")) ? params.get("reiter") : "themen") as Reiter;
  const { data: darstellungen = [], isLoading } = useDarstellungen();
  const { data: themen = [] } = useThemen();
  const [rolle, waehlen] = useGewaehlteRolle(id);
  const d = darstellungen.find((x) => x.id === id);

  // Ein Sprung zu „#kapitel-8" oder „#bereich-3" kommt vor den Daten an.
  useEffect(() => {
    if (!hash || !d) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
    return () => clearTimeout(t);
  }, [hash, d, reiter]);

  if (isLoading) return <Rahmen titel="Wissensbibliothek"><Loader2 className="animate-spin" /></Rahmen>;
  if (!d) {
    return (
      <Rahmen krumen={[{ label: "Wissensbibliothek", to: "/intern/bibliothek" }]} titel="Darstellung nicht gefunden">
        <p className="text-muted-foreground">Eine Darstellung „{id}“ gibt es nicht.</p>
      </Rahmen>
    );
  }
  const eigene = themen.filter((t) => t.presentation_id === d.id);

  return (
    <Rahmen
      krumen={[{ label: "Wissensbibliothek", to: "/intern/bibliothek" }, { label: d.id }]}
      titel={d.title}
      untertitel={[d.epoch, d.period].filter(Boolean).join(" · ")}
    >
      {d.body && <Text inhalt={d.body} className="mb-4" />}

      <nav aria-label="Ansichten" className="mb-4 flex gap-1 overflow-x-auto border-b">
        {REITER.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setParams(r.id === "themen" ? {} : { reiter: r.id }, { replace: true })}
            aria-current={reiter === r.id ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-2 py-2 text-sm sm:px-3 ${
              reiter === r.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </nav>

      {reiter === "themen" && (
        <div className="space-y-4">
          <RollenWahl darstellung={d} rolle={rolle} waehlen={waehlen} />
          <Kapiteluebersicht kapitel={kapitelDer(d.chapters)} themen={eigene} rolle={rolle} />
        </div>
      )}
      {reiter === "belege" && <Belege d={d} rolle={rolle} />}
      {reiter === "tafeln" && <Bildtafeln d={d} />}
      {reiter === "quellen" && <Quellen d={d} />}
      {reiter === "offen" && <Offen d={d} />}
    </Rahmen>
  );
}

/** Die Belegkarten in den neun Sachbereichen, mit Filter nach Stufe und Ebene. */
function Belege({ d, rolle }: { d: Darstellung; rolle: string | null }) {
  const { data: karten = [] } = useKarten(d.id);
  const [stufe, setStufe] = useState<Stufe | null>(null);
  const [ebene, setEbene] = useState<string | null>(null);
  const gefiltert = karten.filter((k) =>
    (!stufe || k.grade === stufe) && (!ebene || k.level === ebene) && fuerRolle(k.roles, rolle)
  );
  const ebenenInGebrauch = d.levels.filter((l) => karten.some((k) => k.level === l));
  const knopf = (aktiv: boolean) =>
    `rounded border px-2.5 py-1 ${aktiv ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Stufe</span>
        {(["Q", "F", "A"] as Stufe[]).map((s) => (
          <button key={s} type="button" onClick={() => setStufe(stufe === s ? null : s)} aria-pressed={stufe === s} className={knopf(stufe === s)}>
            {s}
          </button>
        ))}
        {ebenenInGebrauch.length > 1 && (
          <>
            <span className="ml-3 text-muted-foreground">Ebene</span>
            {ebenenInGebrauch.map((l) => (
              <button key={l} type="button" onClick={() => setEbene(ebene === l ? null : l)} aria-pressed={ebene === l} className={knopf(ebene === l)}>
                {l}
              </button>
            ))}
          </>
        )}
        {rolle && <span className="ml-3 text-xs text-muted-foreground">Karten nur für andere Rollen ausgeblendet.</span>}
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
              <h2 className="mb-1 font-serif text-xl font-bold">
                <span className="mr-2 text-muted-foreground">{b}</span>{d.areas[String(b)] ?? `Bereich ${b}`}
              </h2>
              {liste.length === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">Noch keine Karte{stufe || ebene ? " in dieser Auswahl" : ""}.</p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">{liste.map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Bildtafeln({ d }: { d: Darstellung }) {
  const { data: tafeln = [] } = useTafeln();
  const liste = tafeln.filter((t) => t.presentation_id === d.id);
  if (!liste.length) return <p className="text-muted-foreground">Noch keine Bildtafel.</p>;
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {liste.map((t) => (
        <li key={t.id}>
          <Link to={`/intern/bibliothek/tafel/${t.id}`} className="block px-3 py-2.5 hover:bg-muted/60">
            <span className="block">{t.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{t.id}</span>
              {datierungText(t) && <span>{datierungText(t)}</span>}
              {t.situation && <span>{LAGE[t.situation] ?? t.situation}</span>}
              {t.shows.length > 0 && <span>zeigt {t.shows.length}</span>}
              <RechteAbzeichen rechte={t.rights_status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Die Quellen, die Karten dieser Darstellung zitieren. Das ganze Register steht unter „Quellen". */
function Quellen({ d }: { d: Darstellung }) {
  const { data: quellen = [] } = useQuellen();
  const { data: karten = [] } = useKarten(d.id);
  const { data: verweise = [] } = useVerweise();
  const zaehlung = useMemo(() => {
    const eigene = new Set(karten.map((k) => k.id));
    const m = new Map<string, number>();
    for (const v of verweise) if (v.source_id && eigene.has(v.card_id)) m.set(v.source_id, (m.get(v.source_id) ?? 0) + 1);
    return m;
  }, [karten, verweise]);
  const liste = quellen.filter((q) => zaehlung.has(q.id));
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Zitiert von Karten dieser Darstellung. Alle Quellen: <Link to="/intern/bibliothek/quellen" className="text-primary hover:underline">Quellenregister</Link>.
      </p>
      {!liste.length ? <p className="text-muted-foreground">Noch keine.</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {liste.map((q) => (
            <li key={q.id}>
              <Link to={`/intern/bibliothek/quelle/${q.id}`} className="block px-3 py-2.5 hover:bg-muted/60">
                <span className="block">{q.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {[q.kind, q.year].filter(Boolean).join(", ")}
                  <span className="font-mono">{q.id}</span>
                  <RechteAbzeichen rechte={q.rights_status} />
                  <span>{zaehlung.get(q.id)} Fundstellen</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Was nicht belegt ist: die Abschnitte „Offen" der Themenseiten, dann Karten, die noch nicht fertig sind. */
function Offen({ d }: { d: Darstellung }) {
  const { data: themen = [] } = useThemen();
  const { data: karten = [] } = useKarten(d.id);
  const offen = themen
    .filter((t) => t.presentation_id === d.id)
    .map((t) => ({ t, text: abschnitt(t.body, "Offen") }))
    .filter((x): x is { t: typeof x.t; text: string } => !!x.text);
  const unfertig = karten.filter((k: Karte) => k.status !== "checked");
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-serif text-xl font-bold">Aus den Themenseiten</h2>
        {!offen.length ? <p className="text-sm text-muted-foreground">Keine Themenseite nennt etwas Offenes.</p> : (
          <ul className="space-y-3">
            {offen.map(({ t, text }) => (
              <li key={t.id} className="rounded-lg border bg-card p-3">
                <Link to={`/intern/bibliothek/thema/${t.id}`} className="font-medium text-primary hover:underline">{t.title}</Link>
                <span className="ml-2 text-xs text-muted-foreground">Kapitel {t.chapter}</span>
                <Text inhalt={text} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-serif text-xl font-bold">Karten, die noch nicht fertig sind</h2>
        {!unfertig.length ? <p className="text-sm text-muted-foreground">Alle geprüft.</p> : (
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {unfertig.map((k) => (
              <li key={k.id} className="flex items-center gap-2 px-3 py-2">
                <Link to={`/intern/bibliothek/karte/${k.id}`} className="font-mono text-primary hover:underline">{k.id}</Link>
                <StatusAbzeichen status={k.status} />
                <span className="truncate text-muted-foreground">{k.statement}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
