import { useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight, ImageOff, Lock, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SEITE } from "@/lib/layout";
import { RECHTE, STATUS, STUFE, kartenVerlinken, type KartenStatus, type Rechte, type Stufe } from "@/lib/bibliothek";
import { useBibliotheksrechte, useBildAdresse, type Bild } from "@/hooks/useBibliothek";

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
    <div className={`prose prose-sm dark:prose-invert max-w-[68ch] prose-p:my-2 prose-a:text-primary ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("/") ? (
              <Link to={href}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
        }}
      >
        {kartenVerlinken(inhalt)}
      </ReactMarkdown>
    </div>
  );
}

export function StufeAbzeichen({ stufe, gross = false }: { stufe: Stufe; gross?: boolean }) {
  return (
    <span
      title={`Belegstufe ${stufe}`}
      className={`inline-flex items-center justify-center rounded border font-bold ${STUFE[stufe].farbe} ${
        gross ? "h-9 min-w-9 px-2 text-lg" : "h-6 min-w-6 px-1.5 text-xs"
      }`}
    >
      {STUFE[stufe].kurz}
    </span>
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
        className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60"
      >
        <StufeAbzeichen stufe={karte.grade} />
        <span className="min-w-0 flex-1">
          <span className="block">{karte.statement}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{karte.id}</span>
            {karte.level && <span>Ebene {karte.level}</span>}
            <StatusAbzeichen status={karte.status} />
          </span>
        </span>
      </Link>
    </li>
  );
}
