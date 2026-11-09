import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  BildAnsicht, Rahmen, RechteAbzeichen, StatusAbzeichen, StufeAbzeichen, Text,
} from "@/components/bibliothek/Bausteine";
import {
  useBilder, useDarstellungen, useKarte, useQuellen, useTafeln, type Fundstelle, type Quelle, type Tafel,
} from "@/hooks/useBibliothek";
import type { Bild } from "@/hooks/useBibliothek";
import { STATUS } from "@/lib/bibliothek";

const datum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-DE") : null);

/** Wie eine Quelle in der Fundstelle heisst: Titel, Ort, Jahr. */
const kurztitel = (q: Quelle) => [q.title, [q.place_publisher, q.year].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/**
 * Eine Belegkarte – so gebaut, dass man sie auf einer Veranstaltung in der
 * Hand zeigen kann: oben der Kernsatz und wie sicher er ist, darunter die
 * markierte Stelle gross, die ganze Seite einen Tipp entfernt.
 */
export default function BibliothekKarte() {
  const { id } = useParams();
  const { data, isLoading } = useKarte(id);
  const { data: darstellungen = [] } = useDarstellungen();
  const { data: quellen = [] } = useQuellen();
  const { data: tafeln = [] } = useTafeln();
  const { data: bilder = new Map<string, Bild>() } = useBilder();

  const krumen = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }];
  if (isLoading) return <Rahmen krumen={krumen} titel="Karte"><Loader2 className="animate-spin" /></Rahmen>;
  const karte = data?.karte;
  if (!karte) {
    return (
      <Rahmen krumen={krumen} titel="Karte nicht gefunden">
        <p className="text-muted-foreground">Eine Karte „{id}“ gibt es nicht.</p>
      </Rahmen>
    );
  }
  const d = darstellungen.find((x) => x.id === karte.presentation_id);
  const bereich = d?.areas[String(karte.area)] ?? `Bereich ${karte.area}`;

  return (
    <Rahmen
      krumen={[
        ...krumen,
        { label: karte.presentation_id, to: `/intern/bibliothek/${karte.presentation_id}` },
        { label: `${karte.area} ${bereich}`, to: `/intern/bibliothek/${karte.presentation_id}#bereich-${karte.area}` },
        { label: karte.id },
      ]}
      titel={<span className="block text-xl sm:text-2xl">{karte.statement}</span>}
      untertitel={<span className="font-mono">Karte {karte.id}</span>}
    >
      {karte.status !== "checked" && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${STATUS[karte.status].farbe}`}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{STATUS[karte.status].label}.</strong>{" "}
            {karte.status === "draft" && "Diese Karte ist noch nicht geprüft."}
            {karte.status === "image_missing" && "Zeigebild oder Seitenbild fehlen noch."}
            {karte.status === "image_replace" && "Das Bild ist nur vorläufig und muss ersetzt werden – siehe unten."}
          </span>
        </div>
      )}

      <dl className="mb-6 grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr] items-start">
        <dt className="text-sm text-muted-foreground pt-1.5">Belegstufe</dt>
        <dd className="flex items-start gap-3">
          <StufeAbzeichen stufe={karte.grade} gross />
          {karte.grade_note && <span className="text-sm pt-1.5">{karte.grade_note}</span>}
        </dd>
        {karte.level && (
          <>
            <dt className="text-sm text-muted-foreground">Ebene</dt>
            <dd>{karte.level}</dd>
          </>
        )}
        {karte.valid_for && (
          <>
            <dt className="text-sm text-muted-foreground">Gilt für Stand</dt>
            <dd>{karte.valid_for}</dd>
          </>
        )}
        {karte.keywords.length > 0 && (
          <>
            <dt className="text-sm text-muted-foreground">Schlagworte</dt>
            <dd className="flex flex-wrap gap-1.5">
              {karte.keywords.map((w) => (
                <Link key={w} to={`/intern/bibliothek?q=${encodeURIComponent(w)}`} className="rounded-full border bg-card px-2.5 py-0.5 text-sm hover:bg-muted">
                  {w}
                </Link>
              ))}
            </dd>
          </>
        )}
      </dl>

      <section className="mb-6 space-y-4">
        <h2 className="font-serif text-xl font-bold">{data!.fundstellen.length === 1 ? "Fundstelle" : "Fundstellen"}</h2>
        {data!.fundstellen.map((f) => (
          <FundstelleAnzeige
            key={f.id}
            f={f}
            quelle={quellen.find((q) => q.id === f.source_id)}
            tafel={tafeln.find((t) => t.id === f.plate_id)}
            bilder={bilder}
          />
        ))}
      </section>

      {karte.body && (
        <section className="mb-6 rounded-lg border bg-card p-4">
          <Text inhalt={karte.body} />
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {karte.as_of && <>Stand {datum(karte.as_of)} · </>}zuletzt geändert {datum(karte.updated_at)}{" "}
        <StatusAbzeichen status={karte.status} />
      </p>
    </Rahmen>
  );
}

function FundstelleAnzeige({
  f, quelle, tafel, bilder,
}: {
  f: Fundstelle;
  quelle: Quelle | undefined;
  tafel: Tafel | undefined;
  bilder: Map<string, Bild>;
}) {
  const zeige = f.pointer_image ? bilder.get(f.pointer_image) : undefined;
  const seite = f.page_image ? bilder.get(f.page_image) : undefined;
  const herkunft = quelle ? kurztitel(quelle) : tafel ? tafel.title : f.source_id ?? f.plate_id ?? "";
  const ziel = f.source_id ? `/intern/bibliothek/quelle/${f.source_id}` : `/intern/bibliothek/tafel/${f.plate_id}`;
  const rechte = quelle?.rights_status ?? tafel?.rights_status;

  return (
    <article className="rounded-lg border bg-card p-4">
      <p className="mb-2 text-sm">
        <Link to={ziel} className="font-medium text-primary hover:underline">{herkunft}</Link>
        {f.page && <>, S. {f.page}</>}
        {f.pdf_page != null && <span className="text-muted-foreground"> (PDF-Seite {f.pdf_page})</span>}
        {tafel && <span className="text-muted-foreground"> – Bildtafel <span className="font-mono">{tafel.id}</span></span>}
        {rechte && <> <RechteAbzeichen rechte={rechte} /></>}
      </p>

      {f.quote && (
        <blockquote className="mb-2 border-l-4 border-primary/50 pl-3 font-serif text-lg leading-snug">
          „{f.quote}“
        </blockquote>
      )}
      {f.quote_note && <p className="mb-3 text-sm text-muted-foreground">{f.quote_note}</p>}

      {tafel && (
        <dl className="mb-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {tafel.readable && (<><dt className="text-muted-foreground">Ablesbar</dt><dd>{tafel.readable}</dd></>)}
          {tafel.not_readable && (<><dt className="text-muted-foreground">Nicht ablesbar</dt><dd>{tafel.not_readable}</dd></>)}
        </dl>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        {(f.pointer_image || !f.page_image) && (
          <figure>
            <BildAnsicht pfad={f.pointer_image} bild={zeige} alt={`Markierte Stelle: ${herkunft}`} beschriftung={`Zeigebild – ${herkunft}${f.page ? `, S. ${f.page}` : ""}`} />
            <figcaption className="mt-1 text-xs text-muted-foreground">Zeigebild, Stelle markiert</figcaption>
          </figure>
        )}
        {f.page_image && (
          <figure>
            <BildAnsicht pfad={f.page_image} bild={seite} vorschau alt={`Ganze Seite: ${herkunft}`} beschriftung={`Ganze Seite – ${herkunft}${f.page ? `, S. ${f.page}` : ""}`} />
            <figcaption className="mt-1 text-xs text-muted-foreground">Ganze Seite – tippen zum Vergrössern</figcaption>
          </figure>
        )}
      </div>
    </article>
  );
}
