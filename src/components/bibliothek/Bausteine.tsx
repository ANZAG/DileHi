import { useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight, ImageOff, Lock, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SEITE } from "@/lib/layout";
import { RECHTE, STATUS, STUFE, kartenVerlinken, type KartenStatus, type Rechte, type Stufe } from "@/lib/bibliothek";
import {
  useBibliotheksrechte, useBildAdresse, useBilder, useKarten, useVerweise, type Bild,
} from "@/hooks/useBibliothek";

export interface Krume {
  label: string;
  to?: string;
}

/**
 * Der Rahmen jeder Bibliotheksseite: Brotkrumen, Titel, und eine klare
 * Auskunft, wenn das Leserecht fehlt – statt einer leeren Liste, die aussieht,
 * als gäbe es nichts.
 */
export function Rahmen({
  krumen, titel, untertitel, aktion, children,
}: {
  krumen?: Krume[];
  titel: React.ReactNode;
  untertitel?: React.ReactNode;
  aktion?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { lesen } = useBibliotheksrechte();
  const pfad: Krume[] = [{ label: "Mitgliederbereich", to: "/intern" }, ...(krumen ?? [])];
  const zurueck = [...pfad].reverse().find((k) => k.to);

  return (
    <div className={SEITE}>
      <nav aria-label="Pfad" className="mb-6 text-sm text-muted-foreground">
        <Link to={zurueck?.to ?? "/intern"} className="inline-flex items-center gap-1 hover:text-foreground sm:hidden">
          <ArrowLeft size={16} /> {zurueck?.label ?? "Zurück"}
        </Link>
        <ol className="hidden sm:flex flex-wrap items-center gap-1">
          {pfad.map((k, i) => (
            <li key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} aria-hidden />}
              {k.to ? <Link to={k.to} className="hover:text-foreground">{k.label}</Link> : <span>{k.label}</span>}
            </li>
          ))}
        </ol>
      </nav>

      {!lesen ? (
        <div className="max-w-lg rounded-lg border bg-card p-6">
          <Lock size={20} className="mb-3 text-muted-foreground" />
          <h1 className="font-serif text-2xl font-bold mb-2">Kein Zugang zur Wissensbibliothek</h1>
          <p className="text-muted-foreground">
            Dafür braucht es das Recht „Wissensbibliothek lesen“. Die Rollenverwaltung kann es vergeben.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight py-1">{titel}</h1>
              {untertitel && <div className="text-sm text-muted-foreground mt-1">{untertitel}</div>}
            </div>
            {aktion}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

/**
 * Text aus der Bibliothek. Kartenkennungen werden zu Links, Links innerhalb
 * der Seite bleiben im selben Fenster.
 */
export function Text({ inhalt, className = "" }: { inhalt: string | null | undefined; className?: string }) {
  if (!inhalt) return null;
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-[68ch] prose-p:my-2 prose-a:text-primary
      prose-table:my-3 prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1 prose-table:text-[0.8125rem] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("/intern/bibliothek/karte/") ? (
              <KartenLink id={href.split("/").pop()!}>{children}</KartenLink>
            ) : href?.startsWith("/") ? (
              <Link to={href} className={href.startsWith("/intern/bibliothek/") ? "whitespace-nowrap" : undefined}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
          // Breite Tabellen scrollen auf dem Handy für sich, statt die Seite zu verbreitern.
          table: ({ children }) => (
            <div className="-mx-1 overflow-x-auto px-1">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {kartenVerlinken(inhalt)}
      </ReactMarkdown>
    </div>
  );
}

export function StufeAbzeichen({ stufe, gross = false, mitText = false }: {
  stufe: Stufe | "offen";
  gross?: boolean;
  mitText?: boolean;
}) {
  const offen = stufe === "offen";
  const label = offen ? "nicht belegt" : STUFE[stufe].label;
  // Zurückhaltend: ein umrandeter Buchstabe in gedeckter Farbe, keine Fläche.
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5" title={offen ? "Nicht belegt" : `${stufe} – ${label}`}>
      <span
        aria-label={offen ? "offen – nicht belegt" : `${stufe} – ${label}`}
        className={`inline-flex items-center justify-center rounded border border-border font-semibold ${
          offen ? "border-dashed text-muted-foreground" : STUFE[stufe].farbe
        } ${gross ? "h-8 min-w-8 px-1.5 text-base" : offen ? "h-5 px-1 text-[0.6875rem] font-medium" : "h-5 min-w-5 px-1 text-[0.6875rem]"}`}
      >
        {offen ? "offen" : STUFE[stufe].kurz}
      </span>
      {mitText && !offen && <span className="text-sm text-muted-foreground">{label}</span>}
    </span>
  );
}

/**
 * Eine Kartennummer im Text. Antippen zeigt Kernsatz, Stufe und Zeigebild,
 * ohne die Seite zu verlassen – wer liest, will meist nur kurz sehen, worauf
 * sich der Satz stützt.
 */
export function KartenLink({ id, children }: { id: string; children?: React.ReactNode }) {
  const [offen, setOffen] = useState(false);
  const { data: karten = [] } = useKarten();
  const { data: verweise = [] } = useVerweise();
  const { data: bilder = new Map<string, Bild>() } = useBilder();
  const karte = karten.find((k) => k.id === id);
  const zeigebild = verweise.find((v) => v.card_id === id && v.pointer_image)?.pointer_image ?? null;

  if (!karte) {
    return <span className="whitespace-nowrap font-mono text-muted-foreground" title="Diese Karte gibt es (noch) nicht">{children ?? id}</span>;
  }
  return (
    <Popover open={offen} onOpenChange={setOffen}>
      {/* Ein Span statt eines Knopfs: Ein Knopf ist ein Block in der Zeile, und
          davor darf umbrochen werden – „(" stand dann allein am Zeilenende. */}
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOffen(true); } }}
          className="cursor-pointer whitespace-nowrap font-mono text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {children ?? id}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] space-y-2 p-3 text-sm" align="start">
        <div className="flex items-start gap-2">
          <StufeAbzeichen stufe={karte.grade} />
          <p className="leading-snug">{karte.statement}</p>
        </div>
        {offen && zeigebild && (
          <BildAnsicht pfad={zeigebild} bild={bilder.get(zeigebild)} alt={`Zeigebild zu ${id}`} className="max-h-60" />
        )}
        <Link to={`/intern/bibliothek/karte/${id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          Karte <span className="font-mono">{id}</span> öffnen <ChevronRight size={14} />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export function StatusAbzeichen({ status }: { status: KartenStatus }) {
  if (status === "checked") return null;
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS[status].farbe}`}>{STATUS[status].label}</span>;
}

export function RechteAbzeichen({ rechte }: { rechte: Rechte }) {
  return (
    <span title={RECHTE[rechte].erklaerung} className={`rounded px-1.5 py-0.5 text-xs font-medium ${RECHTE[rechte].farbe}`}>
      Rechte: {RECHTE[rechte].label}
    </span>
  );
}

/**
 * Ein Bild aus dem Ordner der Bibliothek in SharePoint. Ein Tipp öffnet es
 * gross; dort lässt es sich in Originalgrösse ansehen und verschieben – für
 * Kleingedrucktes auf einer ganzen Seite.
 *
 * `vorschau` zeigt erst die Fassung mit 800 px, die SharePoint selbst
 * erzeugt: Ein Seitenscan hat gern ein Megabyte, und auf dem Handy am
 * Lagerplatz zählt jedes. Die ganze Datei lädt erst, wer das Bild öffnet.
 */
export function BildAnsicht({
  pfad, bild, alt, vorschau = false, className = "", beschriftung,
}: {
  pfad: string | null;
  bild: Bild | undefined;
  alt: string;
  vorschau?: boolean;
  className?: string;
  beschriftung?: string;
}) {
  const [offen, setOffen] = useState(false);
  const [voll, setVoll] = useState(false);
  const adresse = useBildAdresse(bild && pfad ? pfad : null);

  if (!bild || !pfad) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 rounded border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground ${className}`}>
        <ImageOff size={18} aria-hidden />
        Bild fehlt{pfad && <span className="font-mono break-all">{pfad}</span>}
      </div>
    );
  }

  const src = adresse && (vorschau ? adresse.preview ?? adresse.full : adresse.full);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className={`group relative block overflow-hidden rounded border bg-muted/30 ${className}`}
        aria-label={`${alt} gross anzeigen`}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            width={bild.width ?? undefined}
            height={bild.height ?? undefined}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full animate-pulse bg-muted"
            style={{ aspectRatio: bild.width && bild.height ? `${bild.width} / ${bild.height}` : "3 / 4" }}
          />
        )}
        <span className="absolute right-1.5 top-1.5 rounded bg-background/80 p-1 opacity-70 group-hover:opacity-100">
          <Maximize2 size={14} aria-hidden />
        </span>
      </button>

      <Dialog open={offen} onOpenChange={(o) => { setOffen(o); if (!o) setVoll(false); }}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[94dvh] p-2 sm:p-3 flex flex-col gap-2">
          <DialogTitle className="text-sm font-medium pr-8">{beschriftung ?? alt}</DialogTitle>
          <div className="flex-1 min-h-0 overflow-auto rounded bg-muted/30">
            {adresse ? (
              <img
                src={adresse.full}
                alt={alt}
                onClick={() => setVoll((v) => !v)}
                className={voll ? "max-w-none cursor-zoom-out" : "h-full w-full object-contain cursor-zoom-in"}
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-muted" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {voll ? "Originalgrösse – zum Verschieben wischen. Tippen passt das Bild wieder ein." : "Tippen zeigt das Bild in Originalgrösse."}
            {bild.width && bild.height ? ` ${bild.width} × ${bild.height} px.` : ""}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Eine Zeile in einer Kartenliste. */
export function KartenZeile({
  karte,
}: {
  karte: { id: string; statement: string; grade: Stufe; status: KartenStatus; level: string | null };
}) {
  return (
    <li>
      <Link
        to={`/intern/bibliothek/karte/${karte.id}`}
        className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60"
      >
        <span className="mt-0.5"><StufeAbzeichen stufe={karte.grade} /></span>
        <span className="min-w-0 flex-1">
          <span className="block">{karte.statement}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {karte.level && <span>{karte.level}</span>}
            <span className="font-mono opacity-70">{karte.id}</span>
            <StatusAbzeichen status={karte.status} />
          </span>
        </span>
      </Link>
    </li>
  );
}
