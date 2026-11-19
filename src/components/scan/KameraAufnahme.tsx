import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, Crop, Focus, Maximize2, RotateCw, ScanLine, Settings2, X, Zap, ZapOff } from "lucide-react";
import { Ausloeser, unterschied } from "@/lib/scan/ausloeser";
import type { Drehung, Viereck } from "@/lib/scan/geometrie";
import { abstandVierecke, seitenFinden } from "@/lib/scan/seitenFinden";
import type { Zuschnitt } from "@/lib/scan/verarbeitungKern";
import { ViereckEditor } from "./ViereckEditor";

/**
 * Kamera, Vorschau und Auslöser.
 *
 * Verlangt wird 4K; was die Kamera wirklich liefert, steht in den
 * Einstellungen. Die Vorschau wird so gedreht, wie die Seiten am Ende stehen
 * sollen – darüber liegt das Viereck, das für alle Seiten gilt. Mit „Rand
 * automatisch" sucht die Seite das Buch selbst (lib/scan/seitenFinden.ts);
 * wer das Viereck von Hand zieht, schaltet das ab.
 *
 * Am Handy läuft die Kamera im Vollbild, die Knöpfe liegen über dem Bild –
 * sonst verdeckt das Kamerabild alles andere. Liegt das Handy flach über dem
 * Buch, dreht iOS die Ansicht nicht mit; wer quer fotografiert, dreht die
 * Vorschau einmal mit „Drehen".
 *
 * Ausgelöst wird mit dem Knopf, mit der Leertaste (auch ein USB-Fusstaster
 * schickt meist eine Taste) oder von selbst nach dem Umblättern. Jede
 * Aufnahme bestätigt ein Blitz, ein Haken, ein Ton und – wo das Gerät es
 * kann – ein kurzes Vibrieren. (Den Ton schluckt am iPhone der Stummschalter.)
 */

interface Props {
  zuschnitt: Zuschnitt;
  onZuschnitt: (z: Zuschnitt) => void;
  onAufnahme: (roh: Blob) => void;
  /** Seiten bisher, für die Anzeige im Vollbild. */
  seitenZahl: number;
  /** Vorschau der zuletzt fertigen Seite. */
  letzteSeite?: string;
  vollbild: boolean;
  onVollbild: (an: boolean) => void;
}

/** Was Chrome und Edge bei vielen Webcams zusätzlich können; nicht in lib.dom. */
interface Erweitert {
  focusMode?: string[] | string;
  focusDistance?: number;
  exposureMode?: string[] | string;
}

const KAMERA_MERKER = "scan-kamera";
const merken = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ohne Merker */ } };
const erinnern = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

let tonKontext: AudioContext | null = null;
function bestaetigen() {
  try {
    tonKontext ??= new AudioContext();
    const ctx = tonKontext;
    void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  } catch { /* ohne Ton */ }
  try { navigator.vibrate?.(60); } catch { /* ohne Vibration */ }
}

/** Das grösste Rechteck mit Seitenverhältnis b:h, das in w × h' passt. */
function einpassen(b: number, h: number, w: number, hh: number) {
  if (!b || !h || !w || !hh) return null;
  const s = Math.min(w / b, hh / h);
  return { w: Math.floor(b * s), h: Math.floor(h * s) };
}

function Umschalter<T extends string>({ wert, optionen, onWahl, dunkel }: {
  wert: T;
  optionen: [T, string][];
  onWahl: (w: T) => void;
  dunkel?: boolean;
}) {
  return (
    <div role="radiogroup" className={`inline-flex rounded-md border p-0.5 ${dunkel ? "border-white/30 bg-black/40" : "bg-muted/40"}`}>
      {optionen.map(([w, text]) => (
        <button
          key={w}
          type="button"
          role="radio"
          aria-checked={wert === w}
          onClick={() => onWahl(w)}
          className={`px-3 py-1.5 text-sm rounded ${wert === w
            ? "bg-primary text-primary-foreground"
            : dunkel ? "text-white/90" : "text-foreground hover:bg-muted"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function KameraAufnahme({ zuschnitt, onZuschnitt, onAufnahme, seitenZahl, letzteSeite, vollbild, onVollbild }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const vorschau = useRef<HTMLCanvasElement>(null);
  const buehne = useRef<HTMLDivElement>(null);
  const [geraete, setGeraete] = useState<MediaDeviceInfo[]>([]);
  const [geraet, setGeraet] = useState<string>(() => erinnern(KAMERA_MERKER) ?? "");
  const [strom, setStrom] = useState<MediaStream | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufloesung, setAufloesung] = useState<string>("");
  const [automatisch, setAutomatisch] = useState(false);
  const [blitz, setBlitz] = useState(false);
  const [haken, setHaken] = useState(0);
  const [festhalten, setFesthalten] = useState<"geht_nicht" | "aus" | "an">("geht_nicht");
  const [randGefunden, setRandGefunden] = useState<boolean | null>(null);
  const [einstellungen, setEinstellungen] = useState(false);
  const [vorschauGroesse, setVorschauGroesse] = useState({ b: 0, h: 0 });
  const [platz, setPlatz] = useState({ b: 0, h: 0 });
  const ausloeser = useRef(new Ausloeser());
  const zuschnittRef = useRef(zuschnitt);
  zuschnittRef.current = zuschnitt;
  const randAuto = zuschnitt.randAuto !== false;

  // Kamera öffnen, bei jedem Wechsel des Geräts neu.
  useEffect(() => {
    let aktiv = true;
    let offen: MediaStream | null = null;
    (async () => {
      setFehler(null);
      try {
        offen = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(geraet ? { deviceId: { exact: geraet } } : { facingMode: { ideal: "environment" } }),
            width: { ideal: 3840 },
            height: { ideal: 2160 },
          },
        });
        if (!aktiv) { offen.getTracks().forEach((t) => t.stop()); return; }
        setStrom(offen);
        const liste = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (aktiv) setGeraete(liste);
        const spur = offen.getVideoTracks()[0];
        const kann = (spur.getCapabilities?.() ?? {}) as Erweitert;
        const modi = Array.isArray(kann.focusMode) ? kann.focusMode : [];
        setFesthalten(modi.includes("manual") || modi.includes("single-shot") ? "aus" : "geht_nicht");
      } catch (err) {
        if (!aktiv) return;
        // Das gemerkte Gerät gibt es nicht mehr: mit irgendeinem weiter.
        if (geraet && err instanceof DOMException && err.name === "OverconstrainedError") { setGeraet(""); return; }
        setFehler(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Der Browser darf die Kamera nicht benutzen. Erlaube es über das Schloss-Symbol in der Adresszeile."
            : `Die Kamera lässt sich nicht öffnen: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })();
    return () => {
      aktiv = false;
      offen?.getTracks().forEach((t) => t.stop());
      setStrom(null);
    };
  }, [geraet]);

  useEffect(() => {
    const v = video.current;
    if (!v || !strom) return;
    v.srcObject = strom;
    v.play().catch(() => undefined);
    const groesse = () => setAufloesung(v.videoWidth ? `${v.videoWidth} × ${v.videoHeight}` : "");
    v.addEventListener("loadedmetadata", groesse);
    v.addEventListener("resize", groesse);
    return () => {
      v.removeEventListener("loadedmetadata", groesse);
      v.removeEventListener("resize", groesse);
    };
  }, [strom]);

  // Vorschau zeichnen, gedreht.
  useEffect(() => {
    let lauf = 0;
    const zeichnen = () => {
      const v = video.current;
      const c = vorschau.current;
      if (v && c && v.videoWidth) {
        const quer = zuschnitt.drehung === 90 || zuschnitt.drehung === 270;
        const bw = quer ? v.videoHeight : v.videoWidth;
        const bh = quer ? v.videoWidth : v.videoHeight;
        const massstab = Math.min(1, 1280 / Math.max(bw, bh));
        const w = Math.round(bw * massstab);
        const h = Math.round(bh * massstab);
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
          setVorschauGroesse({ b: w, h });
        }
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(w / 2, h / 2);
        ctx.rotate((zuschnitt.drehung * Math.PI) / 180);
        ctx.drawImage(v, (-v.videoWidth * massstab) / 2, (-v.videoHeight * massstab) / 2, v.videoWidth * massstab, v.videoHeight * massstab);
      }
      lauf = requestAnimationFrame(zeichnen);
    };
    lauf = requestAnimationFrame(zeichnen);
    return () => cancelAnimationFrame(lauf);
  }, [zuschnitt.drehung]);

  // Platz für die Vorschau im Vollbild messen.
  useLayoutEffect(() => {
    const el = buehne.current;
    if (!el || !vollbild) return;
    const messen = () => setPlatz({ b: el.clientWidth, h: el.clientHeight });
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vollbild]);

  // Im Vollbild die Seite dahinter nicht scrollen lassen.
  useEffect(() => {
    if (!vollbild) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = vorher; };
  }, [vollbild]);

  // Rand automatisch: zweimal je Sekunde das Buch in der Vorschau suchen.
  useEffect(() => {
    if (!randAuto || !strom) { setRandGefunden(null); return; }
    const takt = setInterval(() => {
      const c = vorschau.current;
      if (!c || !c.width) return;
      const daten = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
      const v = seitenFinden({ breite: c.width, hoehe: c.height, daten });
      setRandGefunden(!!v);
      const z = zuschnittRef.current;
      if (v && z.randAuto !== false && abstandVierecke(v, z.viereck) > 0.015) onZuschnitt({ ...z, viereck: v });
    }, 500);
    return () => clearInterval(takt);
  }, [randAuto, strom, onZuschnitt]);

  const ausloesen = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setBlitz(true);
    setTimeout(() => setBlitz(false), 180);
    setHaken((n) => n + 1);
    bestaetigen();
    ausloeser.current.aufgenommen();
    const roh = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.92));
    if (roh) onAufnahme(roh);
  }, [onAufnahme]);

  // Den Haken nach einer Sekunde wieder ausblenden.
  useEffect(() => {
    if (!haken) return;
    const t = setTimeout(() => setHaken(0), 1100);
    return () => clearTimeout(t);
  }, [haken]);

  // Leertaste – nicht, während man in ein Feld tippt.
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const ziel = e.target as HTMLElement | null;
      if (ziel && (ziel.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(ziel.tagName))) return;
      e.preventDefault();
      void ausloesen();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [ausloesen]);

  // Von selbst auslösen: kleine Graubilder vergleichen.
  useEffect(() => {
    if (!automatisch) return;
    ausloeser.current = new Ausloeser();
    const klein = document.createElement("canvas");
    klein.width = 64;
    klein.height = 36;
    const ctx = klein.getContext("2d", { willReadFrequently: true })!;
    let vorher: Uint8ClampedArray | null = null;
    const takt = setInterval(() => {
      const v = video.current;
      if (!v || !v.videoWidth) return;
      ctx.drawImage(v, 0, 0, 64, 36);
      const d = ctx.getImageData(0, 0, 64, 36).data;
      const grau = new Uint8ClampedArray(64 * 36);
      for (let i = 0; i < grau.length; i++) grau[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
      if (vorher && ausloeser.current.melden(unterschied(grau, vorher), performance.now())) void ausloesen();
      vorher = grau;
    }, 150);
    return () => clearInterval(takt);
  }, [automatisch, ausloesen]);

  const schaerfeFesthalten = async () => {
    const spur = strom?.getVideoTracks()[0];
    if (!spur) return;
    const an = festhalten !== "an";
    const kann = (spur.getCapabilities?.() ?? {}) as Erweitert;
    const modi = Array.isArray(kann.focusMode) ? kann.focusMode : [];
    const jetzt = (spur.getSettings?.() ?? {}) as Erweitert;
    const vorgabe: Erweitert = an
      ? (modi.includes("manual")
        ? { focusMode: "manual", ...(jetzt.focusDistance !== undefined ? { focusDistance: jetzt.focusDistance } : {}) }
        : { focusMode: "single-shot" })
      : { focusMode: "continuous" };
    const belichtung: Erweitert = Array.isArray(kann.exposureMode) && kann.exposureMode.includes("manual")
      ? { exposureMode: an ? "manual" : "continuous" } : {};
    try {
      await spur.applyConstraints({ advanced: [{ ...vorgabe, ...belichtung } as MediaTrackConstraintSet] });
      setFesthalten(an ? "an" : "aus");
    } catch {
      setFehler("Die Kamera lässt sich Schärfe und Belichtung nicht vorschreiben.");
    }
  };

  const drehen = () => onZuschnitt({ ...zuschnitt, drehung: ((zuschnitt.drehung + 90) % 360) as Drehung });
  const seitenart = (
    <Umschalter
      dunkel={vollbild}
      wert={zuschnitt.doppelseite ? "doppel" : "einzel"}
      optionen={[["einzel", "Einzelseite"], ["doppel", "Doppelseite"]]}
      onWahl={(w) => onZuschnitt({ ...zuschnitt, doppelseite: w === "doppel" })}
    />
  );
  const knopf = (an: boolean | undefined, onClick: () => void, inhalt: ReactNode, titel?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={titel}
      aria-pressed={an}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border ${an
        ? "bg-primary/15 border-primary text-primary"
        : vollbild ? "border-white/30 bg-black/40 text-white" : "hover:bg-muted"}`}
    >
      {inhalt}
    </button>
  );

  const passend = vollbild ? einpassen(vorschauGroesse.b, vorschauGroesse.h, platz.b, platz.h) : null;
  const randText = !randAuto ? null : randGefunden === null ? "Suche Buch …" : randGefunden ? "Buch gefunden" : "Kein Buch erkannt – Rahmen von Hand ziehen";

  const einstellungsListe = (
    <div className={`text-sm ${vollbild ? "flex flex-col gap-2 text-white" : "flex flex-wrap items-center gap-x-4 gap-y-2"}`}>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={zuschnitt.farbig} onChange={(e) => onZuschnitt({ ...zuschnitt, farbig: e.target.checked })} />
        Farbig (für Bildtafeln)
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={zuschnitt.finger !== false} onChange={(e) => onZuschnitt({ ...zuschnitt, finger: e.target.checked })} />
        Finger am Rand entfernen
      </label>
      <label className="inline-flex items-center gap-2" title="Lädt beim ersten Mal 32 MB und rechnet dann gut eine Sekunde je Seite.">
        <input type="checkbox" checked={zuschnitt.glaetten === true} onChange={(e) => onZuschnitt({ ...zuschnitt, glaetten: e.target.checked })} />
        Gewölbte Seiten glätten
      </label>
      {geraete.length > 1 && (
        <label className="inline-flex items-center gap-2">
          Kamera
          <select
            value={geraet}
            onChange={(e) => { setGeraet(e.target.value); merken(KAMERA_MERKER, e.target.value); }}
            className="h-9 rounded-md border border-input bg-background text-foreground px-2 text-sm max-w-[16rem]"
          >
            <option value="">Standard</option>
            {geraete.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>)}
          </select>
        </label>
      )}
      {festhalten !== "geht_nicht" && (
        <div>{knopf(festhalten === "an", () => void schaerfeFesthalten(), <><Focus size={16} /> Schärfe festhalten</>)}</div>
      )}
      {aufloesung && <span className={vollbild ? "text-white/70" : "text-muted-foreground"}>Kamera liefert {aufloesung}</span>}
    </div>
  );

  return (
    <div className={vollbild ? "fixed inset-0 z-[100] flex flex-col bg-black" : "space-y-3"} style={vollbild ? { height: "100dvh", margin: 0 } : undefined}>
      <div
        ref={buehne}
        className={vollbild ? "relative flex-1 min-h-0 flex items-center justify-center" : "relative rounded-lg overflow-hidden border bg-black"}
      >
        <video ref={video} playsInline muted className="hidden" />
        <div className="relative" style={passend ? { width: passend.w, height: passend.h } : undefined}>
          <canvas ref={vorschau} className={passend ? "block w-full h-full" : "block w-full h-auto"} />
          {strom && (
            <ViereckEditor
              viereck={zuschnitt.viereck}
              onViereck={(viereck: Viereck) => onZuschnitt({ ...zuschnitt, viereck, randAuto: false })}
              bund={zuschnitt.doppelseite ? zuschnitt.bund : null}
              onBund={(bund) => onZuschnitt({ ...zuschnitt, bund })}
            />
          )}
          {blitz && <div className="absolute inset-0 bg-white/85 pointer-events-none" />}
          {haken > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 rounded-full bg-green-600/90 text-white px-5 py-3 text-lg font-medium shadow-lg">
                <Check size={26} /> Aufgenommen
              </div>
            </div>
          )}
        </div>
        {!strom && !fehler && <p className="absolute p-8 text-center text-sm text-white/80">Kamera wird geöffnet …</p>}
        {fehler && <p className="absolute p-8 text-center text-sm text-white">{fehler}</p>}
        {vollbild && (
          <>
            <div className="absolute top-2 left-2 right-16 flex flex-wrap gap-2 pointer-events-none">
              {randText && <span className="rounded-full bg-black/60 text-white text-xs px-3 py-1">{randText}</span>}
            </div>
            <button
              type="button"
              onClick={() => onVollbild(false)}
              aria-label="Kamera schliessen"
              className="absolute top-2 right-2 h-10 w-10 inline-flex items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={20} />
            </button>
          </>
        )}
      </div>

      {vollbild ? (
        <div className="shrink-0 bg-black/90 text-white px-3 pt-2 space-y-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {seitenart}
            {knopf(randAuto, () => onZuschnitt({ ...zuschnitt, randAuto: !randAuto }), <><ScanLine size={16} /> Rand</>, "Rand des Buches automatisch finden")}
            {knopf(undefined, drehen, <><RotateCw size={16} /> Drehen</>)}
            {knopf(einstellungen, () => setEinstellungen(!einstellungen), <Settings2 size={16} />, "Weitere Einstellungen")}
          </div>
          {einstellungen && <div className="rounded-md border border-white/20 p-3">{einstellungsListe}</div>}
          <div className="grid grid-cols-3 items-center">
            <button type="button" onClick={() => onVollbild(false)} className="justify-self-start flex items-center gap-2" aria-label="Zur Seitenliste">
              <span className="h-12 w-9 rounded border border-white/40 bg-white/10 overflow-hidden">
                {letzteSeite && <img src={letzteSeite} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="text-sm">{seitenZahl} {seitenZahl === 1 ? "Seite" : "Seiten"}</span>
            </button>
            <button
              type="button"
              onClick={() => void ausloesen()}
              disabled={!strom}
              aria-label="Aufnehmen"
              className="justify-self-center h-[4.5rem] w-[4.5rem] rounded-full border-4 border-white bg-primary disabled:opacity-50 active:scale-95 transition-transform"
            />
            <div className="justify-self-end">
              {knopf(automatisch, () => setAutomatisch(!automatisch), automatisch ? <><Zap size={16} /> Auto</> : <><ZapOff size={16} /> Auto</>, "Nach dem Umblättern von selbst auslösen")}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void ausloesen()}
              disabled={!strom}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Camera size={16} /> Aufnehmen <span className="hidden sm:inline text-xs opacity-80">(Leertaste)</span>
            </button>
            {seitenart}
            {knopf(automatisch, () => setAutomatisch(!automatisch), <>{automatisch ? <Zap size={16} /> : <ZapOff size={16} />} Nach dem Umblättern von selbst</>)}
            {knopf(randAuto, () => onZuschnitt({ ...zuschnitt, randAuto: !randAuto }), <><Crop size={16} /> Rand automatisch</>)}
            {knopf(undefined, drehen, <><RotateCw size={16} /> Drehen</>)}
            {knopf(undefined, () => onVollbild(true), <><Maximize2 size={16} /> Vollbild</>)}
          </div>
          {randText && <p className="text-xs text-muted-foreground">{randText}</p>}
          {einstellungsListe}
          {automatisch && (
            <p className="text-xs text-muted-foreground">
              Blättere um und nimm die Hand aus dem Bild. Steht das Bild einen Moment still, wird aufgenommen – mit Blitz, Haken und Ton.
            </p>
          )}
        </>
      )}
    </div>
  );
}
