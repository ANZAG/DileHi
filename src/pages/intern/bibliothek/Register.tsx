import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BildAnsicht, KartenZeile, Rahmen, RechteAbzeichen, Text,
} from "@/components/bibliothek/Bausteine";
import {
  db, useBilder, useDarstellungen, useKarten, useQuellen, useSeiten, useTafeln, useVerweise, type Bild,
} from "@/hooks/useBibliothek";
import { useBibliotheksrechte } from "@/hooks/useBibliothek";
import { RECHTE, type Rechte } from "@/lib/bibliothek";

const KRUMEN = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }];
const ALLE = "__alle__";
const KEINE = "__keine__";

/** Eine Zeile „Bezeichnung: Wert“, nur wenn es einen Wert gibt. */
function Angabe({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/**
 * Das gemeinsame Quellenregister. Eine Quelle steht einmal darin, auch wenn
 * mehrere Darstellungen sie nutzen; der Filter zeigt, welche Quellen eine
 * Darstellung zitiert.
 */
export function BibliothekQuellen() {
  const { data: quellen = [], isLoading } = useQuellen();
  const { data: darstellungen = [] } = useDarstellungen();
  const { data: karten = [] } = useKarten();
  const { data: verweise = [] } = useVerweise();
  const [darstellung, setDarstellung] = useState(ALLE);
  const [rechte, setRechte] = useState(ALLE);

  const zitiert = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of verweise) {
      if (!v.source_id) continue;
      const k = karten.find((x) => x.id === v.card_id);
      if (!m.has(v.source_id)) m.set(v.source_id, new Set());
      m.get(v.source_id)!.add(`${k?.presentation_id ?? ""}|${v.card_id}`);
    }
    return m;
  }, [verweise, karten]);

  const anzahl = (q: string, d?: string) =>
    [...(zitiert.get(q) ?? [])].filter((e) => !d || e.startsWith(`${d}|`)).length;
  const liste = quellen.filter(
    (q) => (darstellung === ALLE || anzahl(q.id, darstellung) > 0) && (rechte === ALLE || q.rights_status === rechte)
  );

  return (
    <Rahmen krumen={[...KRUMEN, { label: "Quellenregister" }]} titel="Quellenregister"
      untertitel="Werke, Archivalien und Vorschriften, auf die sich die Karten stützen – für alle Darstellungen gemeinsam.">
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={darstellung} onValueChange={setDarstellung}>
          <SelectTrigger className="w-56" aria-label="Nach Darstellung filtern"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALLE}>Alle Darstellungen</SelectItem>
            {darstellungen.map((d) => <SelectItem key={d.id} value={d.id}>{d.id} – {d.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rechte} onValueChange={setRechte}>
          <SelectTrigger className="w-44" aria-label="Nach Rechtsstatus filtern"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALLE}>Alle Rechte</SelectItem>
            {(Object.keys(RECHTE) as Rechte[]).map((r) => <SelectItem key={r} value={r}>Rechte: {RECHTE[r].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : liste.length === 0 ? (
        <p className="text-muted-foreground">Keine Quelle in dieser Auswahl.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {liste.map((q) => (
            <li key={q.id}>
              <Link to={`/intern/bibliothek/quelle/${q.id}`} className="block px-3 py-2.5 hover:bg-muted/60">
                <span className="block">{q.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {[q.kind, q.year].filter(Boolean).join(", ")}
                  <span className="font-mono">{q.id}</span>
                  <RechteAbzeichen rechte={q.rights_status} />
                  <span>{anzahl(q.id, darstellung === ALLE ? undefined : darstellung)} Karten</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Rahmen>
  );
}

/** Eine Quelle: die bibliographischen Angaben, ihr Rechtsstatus und wo sie zitiert ist. */
export function BibliothekQuelle() {
  const { id } = useParams();
  const { data: quellen = [], isLoading } = useQuellen();
  const { data: karten = [] } = useKarten();
  const { data: verweise = [] } = useVerweise();
  const { data: bilder = new Map<string, Bild>() } = useBilder();
  const q = quellen.find((x) => x.id === id);
  const krumen = [...KRUMEN, { label: "Quellenregister", to: "/intern/bibliothek/quellen" }];

  if (isLoading) return <Rahmen krumen={krumen} titel="Quelle"><Loader2 className="animate-spin" /></Rahmen>;
  if (!q) return <Rahmen krumen={krumen} titel="Quelle nicht gefunden"><p className="text-muted-foreground">Eine Quelle „{id}“ gibt es nicht.</p></Rahmen>;

  const stellen = verweise.filter((v) => v.source_id === q.id);
  const zitierend = karten.filter((k) => stellen.some((s) => s.card_id === k.id));
  const seitenbilder = [...new Map(stellen.filter((s) => s.page_image).map((s) => [s.page_image!, s])).values()];

  return (
    <Rahmen krumen={[...krumen, { label: q.id }]} titel={q.title} untertitel={<span className="font-mono">{q.id}</span>}>
      <dl className="mb-6 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        <Angabe label="Art">{q.kind}</Angabe>
        <Angabe label="Ort, Verlag">{q.place_publisher}</Angabe>
        <Angabe label="Jahr">{q.year}</Angabe>
        <Angabe label="Hinweis">{q.note}</Angabe>
        <Angabe label="Vorlage">{q.original}</Angabe>
        <Angabe label="Ebene">{q.level}</Angabe>
        <Angabe label="Ausgewertet">{q.evaluated}</Angabe>
        <dt className="text-sm text-muted-foreground">Rechte</dt>
        <dd className="space-y-1">
          <RechteAbzeichen rechte={q.rights_status} />
          {q.rights && <p className="text-sm">{q.rights}</p>}
          <p className="text-xs text-muted-foreground">{RECHTE[q.rights_status].erklaerung}</p>
        </dd>
      </dl>

      {q.body && <section className="mb-6"><Text inhalt={q.body} /></section>}

      <Verbindungen quelle={q} />

      <section className="mb-6">
        <h2 className="font-serif text-xl font-bold mb-2">Zitiert in</h2>
        {zitierend.length === 0 ? <p className="text-sm text-muted-foreground">Noch in keiner Karte.</p> : (
          <ul className="divide-y rounded-lg border bg-card">{zitierend.map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
        )}
      </section>

      {seitenbilder.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-bold mb-2">Zitierte Seiten</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {seitenbilder.map((s) => (
              <li key={s.page_image}>
                <BildAnsicht bild={bilder.get(s.page_image!)} vorschau alt={`${q.title}, S. ${s.page ?? ""}`} />
                <Link to={`/intern/bibliothek/karte/${s.card_id}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
                  S. {s.page ?? "?"} · <span className="font-mono">{s.card_id}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Rahmen>
  );
}

/**
 * Die zwei freiwilligen Verbindungen einer Quelle: das Buch in der
 * Quellensammlung, wo die Datei liegt, und die Angabe auf der öffentlichen
 * Epochenseite. Die Bibliothek funktioniert ohne beide; sie sparen nur das
 * Suchen.
 */
function Verbindungen({ quelle }: { quelle: { id: string; collection_source_id: string | null; public_source_id: string | null } }) {
  const { pflegen } = useBibliotheksrechte();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sammlung = [] } = useQuery({
    queryKey: ["bibliothek", "quellensammlung"],
    queryFn: async () => {
      const { data } = await db.from("sources").select("id, title, epoch").order("title");
      return (data ?? []) as { id: string; title: string; epoch: string }[];
    },
  });
  const { data: oeffentlich = [] } = useQuery({
    queryKey: ["bibliothek", "epochenquellen"],
    queryFn: async () => {
      const { data } = await db.from("epoch_sources").select("id, text, epoch").order("sort_order");
      return (data ?? []) as { id: string; text: string; epoch: string }[];
    },
  });

  const setzen = useMutation({
    mutationFn: async (werte: Record<string, string | null>) => {
      const { error } = await db.from("library_sources").update(werte).eq("id", quelle.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bibliothek", "quellen"] }),
    onError: (e: Error) => toast({ title: "Nicht gespeichert", description: e.message, variant: "destructive" }),
  });

  const buch = sammlung.find((s) => s.id === quelle.collection_source_id);
  const angabe = oeffentlich.find((s) => s.id === quelle.public_source_id);
  if (!pflegen && !buch && !angabe) return null;

  return (
    <section className="mb-6 rounded-lg border bg-card p-4 space-y-3">
      <h2 className="font-semibold">Verbindungen</h2>
      <div>
        <p className="text-sm text-muted-foreground mb-1">In der Quellensammlung (Datei)</p>
        {pflegen ? (
          <Select value={quelle.collection_source_id ?? KEINE}
            onValueChange={(v) => setzen.mutate({ collection_source_id: v === KEINE ? null : v })}>
            <SelectTrigger className="max-w-md" aria-label="Eintrag in der Quellensammlung"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>Keine Verbindung</SelectItem>
              {sammlung.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : buch && <p>{buch.title}</p>}
        {buch && (
          <Link to="/intern/quellen" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink size={13} /> Quellensammlung öffnen
          </Link>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">Auf der öffentlichen Epochenseite</p>
        {pflegen ? (
          <Select value={quelle.public_source_id ?? KEINE}
            onValueChange={(v) => setzen.mutate({ public_source_id: v === KEINE ? null : v })}>
            <SelectTrigger className="max-w-md" aria-label="Öffentliche Quellenangabe"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>Nicht öffentlich angegeben</SelectItem>
              {oeffentlich.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.text.length > 80 ? `${s.text.slice(0, 80)}…` : s.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : angabe && <p className="flex items-start gap-1.5"><Globe size={14} className="mt-1 shrink-0" /> {angabe.text}</p>}
      </div>
    </section>
  );
}

/** Eine Bildtafel mit ihren fünf Angaben. */
export function BibliothekTafel() {
  const { id } = useParams();
  const { data: tafeln = [], isLoading } = useTafeln();
  const { data: karten = [] } = useKarten();
  const { data: verweise = [] } = useVerweise();
  const { data: bilder = new Map<string, Bild>() } = useBilder();
  const t = tafeln.find((x) => x.id === id);

  if (isLoading) return <Rahmen krumen={KRUMEN} titel="Bildtafel"><Loader2 className="animate-spin" /></Rahmen>;
  if (!t) return <Rahmen krumen={KRUMEN} titel="Bildtafel nicht gefunden"><p className="text-muted-foreground">Eine Bildtafel „{id}“ gibt es nicht.</p></Rahmen>;

  const zitierend = karten.filter((k) => verweise.some((v) => v.plate_id === t.id && v.card_id === k.id));
  const datei = t.file ? (t.file.includes("/") ? t.file : `${t.presentation_id}/${t.file}`) : null;

  return (
    <Rahmen
      krumen={[...KRUMEN, { label: t.presentation_id, to: `/intern/bibliothek/${t.presentation_id}` }, { label: t.id }]}
      titel={t.title}
      untertitel={<span className="font-mono">Bildtafel {t.id}</span>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        {datei && <BildAnsicht bild={bilder.get(datei)} alt={t.title} />}
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
          <Angabe label="Objekt">{t.object}</Angabe>
          <Angabe label="Datierung">{t.dating}</Angabe>
          <Angabe label="Reproduktion">{t.reproduction}</Angabe>
          <Angabe label="Ablesbar">{t.readable}</Angabe>
          <Angabe label="Nicht ablesbar">{t.not_readable}</Angabe>
          <Angabe label="Einheit">{t.unit}</Angabe>
          <dt className="text-sm text-muted-foreground">Rechte</dt>
          <dd className="space-y-1">
            <RechteAbzeichen rechte={t.rights_status} />
            {t.rights && <p className="text-sm">{t.rights}</p>}
          </dd>
        </dl>
      </div>
      {t.body && <section className="mt-6"><Text inhalt={t.body} /></section>}
      <section className="mt-6">
        <h2 className="font-serif text-xl font-bold mb-2">Zitiert in</h2>
        {zitierend.length === 0 ? <p className="text-sm text-muted-foreground">Noch in keiner Karte.</p> : (
          <ul className="divide-y rounded-lg border bg-card">{zitierend.map((k) => <KartenZeile key={k.id} karte={k} />)}</ul>
        )}
      </section>
    </Rahmen>
  );
}

/** Eine freie Seite: Methode, Prüfregeln, Zitierstandard. */
export function BibliothekSeite() {
  const { slug } = useParams();
  const { data: seiten = [], isLoading } = useSeiten();
  const s = seiten.find((x) => x.slug === slug);
  if (isLoading) return <Rahmen krumen={KRUMEN} titel="Seite"><Loader2 className="animate-spin" /></Rahmen>;
  if (!s) return <Rahmen krumen={KRUMEN} titel="Seite nicht gefunden"><p className="text-muted-foreground">Eine Seite „{slug}“ gibt es nicht.</p></Rahmen>;
  return (
    <Rahmen krumen={[...KRUMEN, { label: s.title }]} titel={s.title}>
      <Text inhalt={s.body} />
    </Rahmen>
  );
}
