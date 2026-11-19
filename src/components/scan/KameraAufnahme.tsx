import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Focus, RotateCw, Zap, ZapOff } from "lucide-react";
import { Ausloeser, unterschied } from "@/lib/scan/ausloeser";
import type { Drehung } from "@/lib/scan/geometrie";
import type { Zuschnitt } from "@/lib/scan/verarbeitungKern";
import { ViereckEditor } from "./ViereckEditor";

/**
 * Kamera, Vorschau und Auslöser.
 *
 * Verlangt wird 4K; was die Kamera wirklich liefert, steht unter der
 * Vorschau. Die Vorschau wird so gedreht, wie die Seiten am Ende stehen
 * sollen – darüber liegt das Viereck, das für alle Seiten gilt.
 *
 * Ausgelöst wird mit dem Knopf, mit der Leertaste (auch ein USB-Fusstaster
 * schickt meist eine Taste) oder von selbst nach dem Umblättern.
 */

interface Props {
  zuschnitt: Zuschnitt;
  onZuschnitt: (z: Zuschnitt) => void;
  onAufnahme: (roh: Blob) => void;
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

function klick() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
    o.onended = () => ctx.close();
  } catch { /* ohne Ton */ }
}

export function KameraAufnahme({ zuschnitt, onZuschnitt, onAufnahme }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const vorschau = useRef<HTMLCanvasElement>(null);
  const [geraete, setGeraete] = useState<MediaDeviceInfo[]>([]);
  const [geraet, setGeraet] = useState<string>(() => erinnern(KAMERA_MERKER) ?? "");
  const [strom, setStrom] = useState<MediaStream | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufloesung, setAufloesung] = useState<string>("");
  const [automatisch, setAutomatisch] = useState(false);
  const [blitz, setBlitz] = useState(false);
  const [festhalten, setFesthalten] = useState<"geht_nicht" | "aus" | "an">("geht_nicht");
  const ausloeser = useRef(new Ausloeser());

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
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        const ctx = c.getContext("2d")!;
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

  const ausloesen = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setBlitz(true);
    setTimeout(() => setBlitz(false), 150);
    klick();
    ausloeser.current.aufgenommen();
    const roh = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.92));
    if (roh) onAufnahme(roh);
  }, [onAufnahme]);

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

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden border bg-black">
        <video ref={video} playsInline muted className="hidden" />
        <canvas ref={vorschau} className="block w-full h-auto" />
        {strom && (
          <ViereckEditor
            viereck={zuschnitt.viereck}
            onViereck={(viereck) => onZuschnitt({ ...zuschnitt, viereck })}
            bund={zuschnitt.doppelseite ? zuschnitt.bund : null}
            onBund={(bund) => onZuschnitt({ ...zuschnitt, bund })}
          />
        )}
        {blitz && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}
        {!strom && !fehler && <p className="p-8 text-center text-sm text-white/80">Kamera wird geöffnet …</p>}
        {fehler && <p className="p-8 text-center text-sm text-white">{fehler}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void ausloesen()}
          disabled={!strom}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Camera size={16} /> Aufnehmen <span className="hidden sm:inline text-xs opacity-80">(Leertaste)</span>
        </button>
        <button
          type="button"
          onClick={() => setAutomatisch(!automatisch)}
          disabled={!strom}
          aria-pressed={automatisch}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border ${automatisch ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"}`}
        >
          {automatisch ? <Zap size={16} /> : <ZapOff size={16} />} Nach dem Umblättern von selbst
        </button>
        <button type="button" onClick={drehen} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted">
          <RotateCw size={16} /> Drehen
        </button>
        {festhalten !== "geht_nicht" && (
          <button
            type="button"
            onClick={() => void schaerfeFesthalten()}
            aria-pressed={festhalten === "an"}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border ${festhalten === "an" ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"}`}
          >
            <Focus size={16} /> Schärfe festhalten
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {geraete.length > 1 && (
          <label className="inline-flex items-center gap-2">
            Kamera
            <select
              value={geraet}
              onChange={(e) => { setGeraet(e.target.value); merken(KAMERA_MERKER, e.target.value); }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[16rem]"
            >
              <option value="">Standard</option>
              {geraete.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>)}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={zuschnitt.doppelseite} onChange={(e) => onZuschnitt({ ...zuschnitt, doppelseite: e.target.checked })} />
          Doppelseite am Bund teilen
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={zuschnitt.farbig} onChange={(e) => onZuschnitt({ ...zuschnitt, farbig: e.target.checked })} />
          Farbig (für Bildtafeln)
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={zuschnitt.finger !== false} onChange={(e) => onZuschnitt({ ...zuschnitt, finger: e.target.checked })} />
          Finger am Rand entfernen
        </label>
        {aufloesung && <span className="text-muted-foreground">Kamera liefert {aufloesung}</span>}
      </div>
      {automatisch && (
        <p className="text-xs text-muted-foreground">
          Blättere um und nimm die Hand aus dem Bild. Steht das Bild einen Moment still, wird aufgenommen – mit einem kurzen Ton.
        </p>
      )}
    </div>
  );
}
