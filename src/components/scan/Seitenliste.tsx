import { ArrowLeft, ArrowRight, Camera, Crop, Loader2, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import type { Aufnahme } from "@/lib/scan/speicher";
import { SCHRIFT_NAME } from "@/lib/scan/ocr";
import { pruefungFuer, type Pruefung } from "@/lib/scan/pruefung";
import type { OcrZustand } from "./useTexterkennung";

/**
 * Die gescannten Seiten in ihrer Reihenfolge. Eine Aufnahme kann zwei Seiten
 * haben (Doppelseite); verschoben, neu zugeschnitten und gelöscht wird je
 * Aufnahme, eine einzelne Seite lässt sich aber auch allein entfernen
 * (etwa eine leere Rückseite).
 */

interface Props {
  aufnahmen: Aufnahme[];
  bilder: Map<string, string>;
  ocr: Record<string, OcrZustand>;
  onVerschieben: (aufnahmeId: string, richtung: -1 | 1) => void;
  onAufnahmeLoeschen: (aufnahmeId: string) => void;
  onSeiteLoeschen: (aufnahmeId: string, seiteId: string) => void;
  onZuschneiden: (aufnahmeId: string) => void;
  onSeiteDrehen: (aufnahmeId: string, seiteId: string) => void;
  onNeuLesen: (seiteId: string) => void;
  /** Neu aufnehmen: eine Seite (seiteId) oder die ganze Aufnahme. */
  onErsetzen: (aufnahmeId: string, seiteId?: string) => void;
  /** Wartet gerade auf Ersatz (Aufnahme, ggf. nur diese Seite). */
  ersetztWird?: string;
  ersetztSeite?: string;
  /** Eben ersetzt: kurz hervorheben. */
  markiert?: string | null;
}

function Lesestand({ z, pruefung, onNeu }: { z: OcrZustand | undefined; pruefung: Pruefung | null; onNeu: () => void }) {
  if (!z || z.zustand === "wartet") return <span className="text-muted-foreground">Text: wartet</span>;
  if (z.zustand === "liest") return <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 size={10} className="animate-spin" /> liest</span>;
  if (z.zustand === "fehler") {
    return (
      <button type="button" onClick={onNeu} title={z.fehler} className="inline-flex items-center gap-1 text-destructive hover:underline">
        <RotateCcw size={10} /> Fehler – neu lesen
      </button>
    );
  }
  if (pruefung?.art === "leer") return <span className="text-muted-foreground" title="Kaum Tinte – eine leere Seite. Sie bleibt, damit die Zählung zum Buch stimmt.">leer</span>;
  const farbe = pruefung?.art === "pruefen"
    ? "text-amber-700 dark:text-amber-400"
    : pruefung && !pruefung.textseite ? "text-muted-foreground"
    : z.sicherheit >= 75 ? "text-green-700 dark:text-green-400" : z.sicherheit >= 55 ? "text-amber-700 dark:text-amber-400" : "text-destructive";
  return (
    <span className={farbe} title={`${SCHRIFT_NAME[z.schrift]}, Sicherheit der Erkennung`}>
      Text {Math.round(z.sicherheit)} %
    </span>
  );
}

export function Seitenliste({ aufnahmen, bilder, ocr, onVerschieben, onAufnahmeLoeschen, onSeiteLoeschen, onZuschneiden, onSeiteDrehen, onNeuLesen, onErsetzen, ersetztWird, ersetztSeite, markiert }: Props) {
  let nummer = 0;
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {aufnahmen.map((a, ai) => (
        <div
          key={a.id}
          id={`aufnahme-${a.id}`}
          className={`rounded-lg border bg-card p-2 space-y-2 transition-shadow ${a.seiten.length > 1 ? "col-span-2" : ""} ${markiert === a.id ? "ring-2 ring-green-600" : ""}`}
        >
          <div className="flex gap-2">
            {a.seiten.map((s) => {
              nummer += 1;
              const url = bilder.get(s.bildId);
              const wartet = ersetztWird === a.id && (!ersetztSeite || ersetztSeite === s.id);
              const pruefung = pruefungFuer(s.befund, ocr[s.id]);
              return (
                <div key={s.id} className="flex-1 min-w-0 space-y-1">
                  <div className={`relative aspect-[3/4] bg-muted rounded overflow-hidden ${wartet ? "ring-2 ring-primary" : pruefung?.art === "pruefen" ? "ring-2 ring-amber-500" : ""}`}>
                    {url && <img src={url} alt={`Seite ${nummer}`} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />}
                    <button
                      type="button"
                      onClick={() => onSeiteDrehen(a.id, s.id)}
                      aria-label={`Seite ${nummer} um 90° drehen`}
                      title="Diese Seite um 90° drehen"
                      className="absolute top-1 left-1 h-6 w-6 inline-flex items-center justify-center rounded bg-background/80 hover:bg-background"
                    >
                      <RotateCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onErsetzen(a.id, s.id)}
                      aria-label={`Seite ${nummer} neu aufnehmen`}
                      title="Diese Seite neu aufnehmen – die nächste Aufnahme kommt an ihre Stelle"
                      className={`absolute bottom-1 right-1 h-7 px-2 inline-flex items-center gap-1 rounded text-[11px] ${wartet ? "bg-primary text-primary-foreground" : "bg-background/85 hover:bg-background"}`}
                    >
                      <Camera size={12} /> {wartet ? "wartet" : "Neu"}
                    </button>
                    {a.seiten.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onSeiteLoeschen(a.id, s.id)}
                        aria-label={`Seite ${nummer} entfernen`}
                        className="absolute top-1 right-1 h-6 w-6 inline-flex items-center justify-center rounded bg-background/80 hover:bg-background"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between gap-1 text-[11px]">
                    <span className="font-medium">S. {nummer}</span>
                    <Lesestand z={ocr[s.id]} pruefung={pruefung} onNeu={() => onNeuLesen(s.id)} />
                  </div>
                  {pruefung?.art === "pruefen" && (
                    <button
                      type="button"
                      onClick={() => onErsetzen(a.id, s.id)}
                      className="w-full text-left text-[11px] leading-tight text-amber-800 dark:text-amber-300 hover:underline"
                      title="Diese Seite neu aufnehmen"
                    >
                      ⚠ {pruefung.gruende.join(" · ")} – neu aufnehmen?
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between">
            <div className="flex gap-1">
              <button type="button" disabled={ai === 0} onClick={() => onVerschieben(a.id, -1)} aria-label="nach vorn" className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-muted disabled:opacity-30">
                <ArrowLeft size={14} />
              </button>
              <button type="button" disabled={ai === aufnahmen.length - 1} onClick={() => onVerschieben(a.id, 1)} aria-label="nach hinten" className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-muted disabled:opacity-30">
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="flex gap-1">
              {a.seiten.length > 1 && (
                <button type="button" onClick={() => onErsetzen(a.id)} aria-label="Doppelseite neu aufnehmen" title="Beide Seiten neu aufnehmen" className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-muted">
                  <Camera size={14} />
                </button>
              )}
              <button type="button" onClick={() => onZuschneiden(a.id)} aria-label="neu zuschneiden" title="Neu zuschneiden" className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-muted">
                <Crop size={14} />
              </button>
              <button type="button" onClick={() => onAufnahmeLoeschen(a.id)} aria-label="Aufnahme löschen" title="Aufnahme löschen" className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-muted text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
