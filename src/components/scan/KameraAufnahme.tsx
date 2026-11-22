import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Camera, Check, Crop, Focus, Maximize2, MoreHorizontal, RotateCw, ScanLine, Smartphone, X, Zap, ZapOff } from "lucide-react";
import { Ausrichtung } from "./Ausrichtung";
import { Ausloeser, unterschied } from "@/lib/scan/ausloeser";
import { viereckAusAnzeige, viereckDrehenUm, viereckZurAnzeige, type Drehung, type Viereck } from "@/lib/scan/geometrie";
import { seitenNeigung, wasserwaage, buchForm, fotoDrehung, lageAus, lageBrauchtErlaubnis, lageErlauben, lageGrob, lageMitBild, oberflaechenDrehung } from "@/lib/scan/lage";
import { abstandVierecke, seitenFinden } from "@/lib/scan/seitenFinden";
import { zuschnittDrehen, type Zuschnitt } from "@/lib/scan/verarbeitungKern";
import { ViereckEditor } from "./ViereckEditor";

/**
 * Kamera, Vorschau und Auslöser.
 *
 * Am Rechner: Vorschau in der Seite, so gedreht, wie die Seiten am Ende
 * stehen sollen; darüber das Viereck, das für alle Seiten gilt.
 *
 * Am Handy wie die Kamera des iPhones: Das Kamerabild füllt den ganzen
 * Bildschirm und wird nicht gedreht. Wie man das Handy hält, sagt der
 * Lagesensor (lib/scan/lage.ts) – das Foto wird entsprechend gedreht, und
 * die Symbole drehen sich an ihrem Platz mit. Liegt das Handy flach über dem
 * Buch, gilt die letzte sichere Lage. Bedienung: oben kleine Symbole (Rand,
 * Selbst auslösen, Einstellungen), unten „Einzelseite · Doppelseite" über
 * dem Auslöser, links die letzte Seite mit Zähler.
 *
 * „Rand automatisch" sucht das Buch selbst (lib/scan/seitenFinden.ts); wer
 * das Viereck von Hand zieht, schaltet das ab.
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
  /** Am Handy: Vorschau ungedreht und bildschirmfüllend, Drehung aus dem Lagesensor. */
  handy?: boolean;
  /** Wartet eine Seite auf Ersatz? Dann steht das gut sichtbar über dem Bild. */
  auftrag?: { text: string; onAbbrechen: () => void };
  /** Die letzte Aufnahme ist unscharf: anbieten, sie gleich zu ersetzen. */
  warnung?: { text: string; onErsetzen: () => void; onSchliessen: () => void };
}

/** Was Chrome und Edge bei vielen Webcams zusätzlich können; nicht in lib.dom. */
interface Erweitert {
  focusMode?: string[] | string;
  focusDistance?: number;
  exposureMode?: string[] | string;
}

const KAMERA_MERKER = "scan-kamera";
const AUSRICHTUNG_MERKER = "scan-ausrichtung";
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

/**
 * Der Teil der Seite, den man gerade sieht. Hat der Browser hineingezoomt
 * (iOS tut das von selbst, wenn man in ein kleines Eingabefeld tippt), ist
 * er kleiner als das Fenster, und ein Vollbild „inset 0" ragte über den
 * Rand – oben verschwänden die Symbole, rechts der Drehknopf. Deshalb liegt
 * das Vollbild genau auf diesem Teil und wird um den Zoom verkleinert.
 */
function useSichtbarerBereich(an: boolean) {
  const [sicht, setSicht] = useState<{ links: number; oben: number; breite: number; hoehe: number; zoom: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!an || !vv) { setSicht(null); return; }
    const messen = () => setSicht({ links: vv.offsetLeft, oben: vv.offsetTop, breite: vv.width, hoehe: vv.height, zoom: vv.scale || 1 });
    messen();
    vv.addEventListener("resize", messen);
    vv.addEventListener("scroll", messen);
    return () => { vv.removeEventListener("resize", messen); vv.removeEventListener("scroll", messen); };
  }, [an]);
  return sicht;
}

/** Seitenverhältnis b:h in w × h einpassen – ganz sichtbar (contain) oder füllend (cover). */
function einpassen(b: number, h: number, w: number, hh: number, fuellen: boolean) {
  if (!b || !h || !w || !hh) return null;
  const s = fuellen ? Math.max(w / b, hh / h) : Math.min(w / b, hh / h);
  return { w: Math.floor(b * s), h: Math.floor(h * s) };
}

function Umschalter<T extends string>({ wert, optionen, onWahl }: {
  wert: T;
  optionen: [T, string][];
  onWahl: (w: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-md border p-0.5 bg-muted/40">
      {optionen.map(([w, text]) => (
        <button
          key={w}
          type="button"
          role="radio"
          aria-checked={wert === w}
          onClick={() => onWahl(w)}
          className={`px-3 py-1.5 text-sm rounded ${wert === w ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function KameraAufnahme({ zuschnitt, onZuschnitt, onAufnahme, seitenZahl, letzteSeite, vollbild, onVollbild, handy = false, auftrag, warnung }: Props) {
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
  const [lage, setLage] = useState<Drehung>(0);
  const [lageBereit, setLageBereit] = useState(() => !lageBrauchtErlaubnis());
  const [grob, setGrob] = useState<Drehung | null>(null);
  /** Wie das Buch im ungedrehten Kamerabild liegt (erst nach zwei gleichen Funden). */
  const [form, setForm] = useState<"hoch" | "quer" | null>(null);
  /** Ausrichtungshilfe (Wasserwaage, Laserstrich); gemerkt je Gerät. */
  const [ausrichtung, setAusrichtung] = useState(() => erinnern(AUSRICHTUNG_MERKER) !== "aus");
  const [waage, setWaage] = useState<{ x: number; y: number; grad: number } | null>(null);
  const waageZeit = useRef(0);
  const formVorher = useRef<"hoch" | "quer" | null>(null);
  const sicht = useSichtbarerBereich(vollbild);
  const ausloeser = useRef(new Ausloeser());
  const zuschnittRef = useRef(zuschnitt);
  zuschnittRef.current = zuschnitt;
  const randAuto = zuschnitt.randAuto !== false;

  /** Am Handy im Vollbild: Kamerabild ungedreht, Drehung aus der Lage. */
  const roh = vollbild && handy;
  const lageAuto = roh && zuschnitt.drehungAuto !== false;
  /** Wie die Vorschau gedreht gezeichnet wird – und was ihr zum Foto noch fehlt. */
  const vorschauDrehung: Drehung = roh ? 0 : zuschnitt.drehung;
  const anzeigeDrehung = (((zuschnitt.drehung - vorschauDrehung) % 360) + 360) % 360 as Drehung;
  /**
   * Die Lage, nach der gedreht wird: vom Sensor, aber vom Bild berichtigt
   * (eine Doppelseite ist breiter als hoch) – ausser man hat selbst um 90°
   * nachgedreht, etwa bei einem Buch im Querformat.
   */
  const lageWirksam: Drehung = lageAuto && (zuschnitt.drehungVersatz ?? 0) % 180 === 0
    ? lageMitBild(lage, form, zuschnitt.doppelseite, grob) : lage;
  /** So weit drehen sich die Symbole, damit sie für den, der das Handy hält, aufrecht stehen. */
  const symbolDrehung = roh ? fotoDrehung(lageWirksam, oberflaechenDrehung()) : 0;

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

  // Vorschau zeichnen – am Rechner gedreht wie das Foto, am Handy ungedreht.
  useEffect(() => {
    let lauf = 0;
    const zeichnen = () => {
      const v = video.current;
      const c = vorschau.current;
      if (v && c && v.videoWidth) {
        const quer = vorschauDrehung === 90 || vorschauDrehung === 270;
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
        ctx.rotate((vorschauDrehung * Math.PI) / 180);
        ctx.drawImage(v, (-v.videoWidth * massstab) / 2, (-v.videoHeight * massstab) / 2, v.videoWidth * massstab, v.videoHeight * massstab);
      }
      lauf = requestAnimationFrame(zeichnen);
    };
    lauf = requestAnimationFrame(zeichnen);
    return () => cancelAnimationFrame(lauf);
  }, [vorschauDrehung]);

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

  // Lage des Handys verfolgen.
  useEffect(() => {
    if (!roh || !lageBereit) return;
    const neu = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      setLage((bisher) => lageAus(e.beta!, e.gamma!, bisher));
      setGrob((bisher) => lageGrob(e.beta!, e.gamma!, bisher));
      // Wasserwaage höchstens zehnmal je Sekunde neu zeichnen.
      const jetzt = performance.now();
      if (jetzt - waageZeit.current > 100) {
        waageZeit.current = jetzt;
        setWaage(wasserwaage(e.beta!, e.gamma!, oberflaechenDrehung()));
      }
    };
    window.addEventListener("deviceorientation", neu);
    return () => window.removeEventListener("deviceorientation", neu);
  }, [roh, lageBereit]);

  // Das Foto folgt der Lage (plus dem, was von Hand oder von der
  // Texterkennung dazugedreht wurde).
  useEffect(() => {
    if (!lageAuto) return;
    const z = zuschnittRef.current;
    const soll = ((fotoDrehung(lageWirksam, oberflaechenDrehung()) + (z.drehungVersatz ?? 0)) % 360) as Drehung;
    const fehlt = (((soll - z.drehung) % 360) + 360) % 360;
    if (fehlt) onZuschnitt(zuschnittDrehen(z, fehlt as 90 | 180 | 270));
  }, [lageWirksam, lageAuto, onZuschnitt]);

  // Rand automatisch: zweimal je Sekunde das Buch in der Vorschau suchen.
  useEffect(() => {
    if (!randAuto || !strom) { setRandGefunden(null); setForm(null); formVorher.current = null; return; }
    const takt = setInterval(() => {
      const c = vorschau.current;
      if (!c || !c.width) return;
      const daten = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
      const z = zuschnittRef.current;
      // In der Vorschau gefunden; ins Foto umgerechnet, das um den Rest gedreht ist.
      const gefunden = seitenFinden({ breite: c.width, hoehe: c.height, daten }, { doppel: z.doppelseite });
      setRandGefunden(!!gefunden);
      if (gefunden && roh) {
        const f = buchForm(gefunden, c.width, c.height);
        if (f === formVorher.current) setForm(f);
        formVorher.current = f;
      }
      if (!gefunden || z.randAuto === false) return;
      const rest = (((z.drehung - (roh ? 0 : z.drehung)) % 360) + 360) % 360 as Drehung;
      const v = viereckDrehenUm(gefunden, rest);
      if (abstandVierecke(v, z.viereck) > 0.015) onZuschnitt({ ...z, viereck: v });
    }, 500);
    return () => clearInterval(takt);
  }, [randAuto, strom, onZuschnitt, roh]);

  const lageAnfragen = useCallback(async () => {
    if (lageBereit) return;
    if (await lageErlauben()) setLageBereit(true);
  }, [lageBereit]);

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

  // Von Hand drehen: Der Rahmen dreht mit; bei der Lage-Automatik bleibt der
  // Zusatz erhalten, wenn man das Handy danach anders hält.
  const drehen = () => {
    const z = zuschnittDrehen(zuschnitt, 90);
    onZuschnitt(lageAuto ? { ...z, drehungVersatz: ((zuschnitt.drehungVersatz ?? 0) + 90) % 360 } : z);
  };

  const randText = !randAuto ? null : randGefunden === null ? "Suche Buch …" : randGefunden ? "Buch gefunden" : "Kein Buch erkannt – Rahmen von Hand ziehen";
  /** Bildschirm breiter als hoch (Handy quer, Drehsperre aus): Bedienung an die Seiten. */
  const quer = vollbild && (sicht ? sicht.breite > sicht.hoehe * 1.1 : typeof window !== "undefined" && window.innerWidth > window.innerHeight * 1.1);
  /**
   * Hochkant füllt das Kamerabild den Bildschirm wie beim iPhone. Quer wäre
   * dann oben und unten ein Stück vom Buch abgeschnitten (mit den Ecken des
   * Rahmens) – dort steht es deshalb ganz zwischen den beiden Spalten.
   */
  const passend = vollbild ? einpassen(vorschauGroesse.b, vorschauGroesse.h, platz.b, platz.h, roh && !quer) : null;
  const gedreht: CSSProperties = { transform: `rotate(${symbolDrehung}deg)`, transition: "transform 0.3s" };

  const editor = strom && (
    <ViereckEditor
      viereck={viereckZurAnzeige(zuschnitt.viereck, anzeigeDrehung)}
      onViereck={(v: Viereck) => onZuschnitt({ ...zuschnitt, viereck: viereckAusAnzeige(v, anzeigeDrehung), randAuto: false })}
      bund={zuschnitt.doppelseite ? zuschnitt.bund : null}
      onBund={(bund) => onZuschnitt({ ...zuschnitt, bund })}
    />
  );

  const einstellungsListe = (dunkel: boolean) => (
    <div className={`text-sm ${dunkel ? "flex flex-col gap-2.5 text-white" : "flex flex-wrap items-center gap-x-4 gap-y-2"}`}>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={zuschnitt.farbig} onChange={(e) => onZuschnitt({ ...zuschnitt, farbig: e.target.checked })} />
        Farbig (nur für Bildtafeln – Karten und Abbildungen erkennt die Seite selbst)
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={zuschnitt.finger !== false} onChange={(e) => onZuschnitt({ ...zuschnitt, finger: e.target.checked })} />
        Finger am Rand entfernen
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={ausrichtung} onChange={(e) => { setAusrichtung(e.target.checked); merken(AUSRICHTUNG_MERKER, e.target.checked ? "an" : "aus"); }} />
        Ausrichtungshilfe (Wasserwaage und Linie für gerade Zeilen)
      </label>
      <label className="inline-flex items-center gap-2" title="Lädt beim ersten Mal 32 MB und rechnet dann gut eine Sekunde je Seite.">
        <input type="checkbox" checked={zuschnitt.glaetten === true} onChange={(e) => onZuschnitt({ ...zuschnitt, glaetten: e.target.checked })} />
        Gewölbte Seiten glätten
      </label>
      {roh && (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={lageAuto}
            onChange={(e) => {
              if (e.target.checked) void lageAnfragen();
              onZuschnitt({ ...zuschnitt, drehungAuto: e.target.checked, drehungVersatz: 0 });
            }}
          />
          Drehung aus der Lage des Handys
        </label>
      )}
      {roh && (
        <button type="button" onClick={drehen} className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/30">
          <RotateCw size={16} /> Foto um 90° drehen
        </button>
      )}
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
        <button
          type="button"
          onClick={() => void schaerfeFesthalten()}
          aria-pressed={festhalten === "an"}
          className={`self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${festhalten === "an" ? "bg-primary/15 border-primary text-primary" : dunkel ? "border-white/30" : "hover:bg-muted"}`}
        >
          <Focus size={16} /> Schärfe festhalten
        </button>
      )}
      {aufloesung && <span className={dunkel ? "text-white/60" : "text-muted-foreground"}>Kamera liefert {aufloesung}</span>}
    </div>
  );

  // ── Vollbild (Handy, oder am Rechner auf Wunsch) ──────────────────────────
  if (vollbild) {
    const symbol = (an: boolean | undefined, onClick: () => void, inhalt: ReactNode, titel: string) => (
      <button
        type="button"
        onClick={onClick}
        aria-label={titel}
        title={titel}
        aria-pressed={an}
        className={`h-10 w-10 inline-flex items-center justify-center rounded-full ${an ? "bg-primary/90 text-primary-foreground" : "bg-black/40 text-white"}`}
      >
        <span style={gedreht} className="inline-flex">{inhalt}</span>
      </button>
    );
    return (
      <div
        className="fixed z-[100] bg-black text-white touch-none overflow-hidden"
        style={sicht
          ? { left: sicht.links, top: sicht.oben, width: sicht.breite * sicht.zoom, height: sicht.hoehe * sicht.zoom, transform: `scale(${1 / sicht.zoom})`, transformOrigin: "0 0", margin: 0 }
          : { inset: 0, height: "100dvh", margin: 0 }}
      >
        <video ref={video} playsInline muted className="hidden" />
        <div ref={buehne} className={`absolute overflow-hidden flex items-center justify-center ${quer ? "inset-y-0 left-16 right-32" : "inset-0"}`} onClick={() => void lageAnfragen()}>
          <div className="relative shrink-0" style={passend ? { width: passend.w, height: passend.h } : undefined}>
            <canvas ref={vorschau} className="block w-full h-full" />
            {ausrichtung && passend && (
              <Ausrichtung
                waage={roh && lageBereit ? waage : null}
                neigung={randAuto && randGefunden ? seitenNeigung(viereckZurAnzeige(zuschnitt.viereck, anzeigeDrehung), passend.w, passend.h) : null}
                drehung={symbolDrehung}
              />
            )}
            {editor}
            {blitz && <div className="absolute inset-0 bg-white/85 pointer-events-none" />}
          </div>
          {!strom && !fehler && <p className="absolute p-8 text-center text-sm text-white/80">Kamera wird geöffnet …</p>}
          {fehler && <p className="absolute p-8 text-center text-sm">{fehler}</p>}
        </div>

        {/* Schliessen, Symbole, Einstellungen – wie beim iPhone: hochkant
            oben in einer Leiste, quer in einer Spalte links. */}
        <div
          className={`absolute bg-black/45 flex items-center justify-between ${quer ? "left-0 inset-y-0 w-16 flex-col py-3" : "top-0 inset-x-0 px-3 pb-2"}`}
          style={quer ? { paddingLeft: "env(safe-area-inset-left)" } : { paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          {symbol(undefined, () => onVollbild(false), <X size={20} />, "Kamera schliessen")}
          <div className={`flex items-center gap-3 ${quer ? "flex-col" : ""}`}>
            {symbol(randAuto, () => onZuschnitt({ ...zuschnitt, randAuto: !randAuto }), <ScanLine size={18} />, "Rand automatisch")}
            {symbol(automatisch, () => setAutomatisch(!automatisch), automatisch ? <Zap size={18} /> : <ZapOff size={18} />, "Selbst auslösen")}
            {roh && symbol(lageAuto, () => {
              void lageAnfragen();
              onZuschnitt({ ...zuschnitt, drehungAuto: !lageAuto, drehungVersatz: 0 });
            }, <Smartphone size={18} />, "Drehung aus der Lage des Handys")}
          </div>
          {symbol(einstellungen, () => setEinstellungen(!einstellungen), <MoreHorizontal size={20} />, "Weitere Einstellungen")}
        </div>

        {/* Hinweise oben in der Mitte */}
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none"
          style={{ top: quer ? "max(0.5rem, env(safe-area-inset-top))" : "calc(max(0.5rem, env(safe-area-inset-top)) + 3.25rem)" }}
        >
          {auftrag && (
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium pl-3 pr-1 py-1 shadow">
              <Camera size={15} /> {auftrag.text}
              <button type="button" onClick={auftrag.onAbbrechen} className="rounded-full bg-black/25 px-2 py-0.5 text-xs">Abbrechen</button>
            </span>
          )}
          {warnung && (
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-amber-500 text-black text-sm font-medium pl-3 pr-1 py-1 shadow">
              ⚠ {warnung.text}
              <button type="button" onClick={warnung.onErsetzen} className="rounded-full bg-black/80 text-white px-2 py-0.5 text-xs">Neu aufnehmen</button>
              <button type="button" onClick={warnung.onSchliessen} aria-label="Hinweis schliessen" className="rounded-full px-1.5 text-xs">✕</button>
            </span>
          )}
          {randText && <span className="rounded-full bg-black/55 text-xs px-3 py-1">{randText}</span>}
          {automatisch && <span className="rounded-full bg-primary/90 text-primary-foreground text-xs px-3 py-1">Löst nach dem Umblättern selbst aus – Hand aus dem Bild</span>}
          {roh && lageAuto && !lageBereit && (
            <button type="button" onClick={() => void lageAnfragen()} className="pointer-events-auto rounded-full bg-white/90 text-black text-xs px-3 py-1">
              Antippen: Drehung des Handys erkennen
            </button>
          )}
        </div>

        {haken > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={gedreht} className="flex items-center gap-2 rounded-full bg-green-600/90 px-5 py-3 text-lg font-medium shadow-lg">
              <Check size={26} /> Aufgenommen
            </div>
          </div>
        )}

        {einstellungen && (
          <div
            className={`absolute rounded-xl bg-black/85 border border-white/15 p-4 overflow-y-auto ${quer ? "left-20 top-3 bottom-3 w-72" : "inset-x-3"}`}
            style={quer ? undefined : { bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 9.5rem)" }}
          >
            {einstellungsListe(true)}
          </div>
        )}

        {/* Einzel-/Doppelseite wie „Video · Foto" und der Auslöser: hochkant
            unten, quer in einer Spalte rechts. */}
        <div
          className={`absolute bg-black/55 ${quer ? "right-0 inset-y-0 w-32 flex flex-col items-center justify-between py-3" : "bottom-0 inset-x-0 px-4 pt-3 space-y-3"}`}
          style={quer ? { paddingRight: "env(safe-area-inset-right)" } : { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {quer && symbol(undefined, drehen, <RotateCw size={20} />, "Foto um 90° drehen")}
          <div role="radiogroup" className={`flex justify-center font-medium tracking-wide ${quer ? "flex-col items-center gap-1 text-[11px]" : "gap-6 text-sm"}`}>
            {([["einzel", "EINZELSEITE"], ["doppel", "DOPPELSEITE"]] as const).map(([w, text]) => {
              const an = zuschnitt.doppelseite === (w === "doppel");
              return (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={an}
                  onClick={() => onZuschnitt({ ...zuschnitt, doppelseite: w === "doppel" })}
                  className={`px-3 py-1 rounded-full ${an ? "text-primary bg-white/10" : "text-white/80"}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
          {(() => {
            const vorschauBild = (
              <button type="button" onClick={() => onVollbild(false)} className={`${quer ? "" : "justify-self-start"} relative`} aria-label={`Zur Seitenliste, ${seitenZahl} Seiten`}>
                <span style={gedreht} className={`block rounded-lg border-2 border-white/60 bg-white/10 overflow-hidden ${quer ? "h-12 w-12" : "h-14 w-14"}`}>
                  {letzteSeite && <img src={letzteSeite} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center">
                  {seitenZahl}
                </span>
              </button>
            );
            const ausloeserKnopf = (
              <button
                type="button"
                onClick={() => { void lageAnfragen(); void ausloesen(); }}
                disabled={!strom}
                aria-label="Aufnehmen"
                className={`${quer ? "h-[4.25rem] w-[4.25rem]" : "justify-self-center h-[4.75rem] w-[4.75rem]"} rounded-full border-[5px] border-white/90 bg-white disabled:opacity-50 active:scale-95 transition-transform`}
              />
            );
            return quer ? <>{ausloeserKnopf}{vorschauBild}</> : (
              <div className="grid grid-cols-3 items-center">
                {vorschauBild}
                {ausloeserKnopf}
                <div className="justify-self-end">
                  {symbol(undefined, drehen, <RotateCw size={20} />, "Foto um 90° drehen")}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ── In der Seite (Rechner) ────────────────────────────────────────────────
  const knopf = (an: boolean | undefined, onClick: () => void, inhalt: ReactNode, titel?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={titel}
      aria-pressed={an}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border ${an ? "bg-primary/15 border-primary text-primary" : "hover:bg-muted"}`}
    >
      {inhalt}
    </button>
  );

  return (
    <div className="space-y-3">
      {warnung && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm">
          <span className="font-medium">⚠ {warnung.text}</span>
          <button type="button" onClick={warnung.onErsetzen} className="ml-auto underline">Neu aufnehmen</button>
          <button type="button" onClick={warnung.onSchliessen} className="text-muted-foreground underline">Ausblenden</button>
        </div>
      )}
      {auftrag && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
          <Camera size={16} className="text-primary" /> <span className="font-medium">{auftrag.text}</span>
          <button type="button" onClick={auftrag.onAbbrechen} className="ml-auto text-muted-foreground hover:text-foreground underline">Abbrechen</button>
        </div>
      )}
      <div ref={buehne} className="relative rounded-lg overflow-hidden border bg-black">
        <video ref={video} playsInline muted className="hidden" />
        <div className="relative">
          <canvas ref={vorschau} className="block w-full h-auto" />
          {editor}
          {blitz && <div className="absolute inset-0 bg-white/85 pointer-events-none" />}
          {haken > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 rounded-full bg-green-600/90 text-white px-5 py-3 text-lg font-medium shadow-lg">
                <Check size={26} /> Aufgenommen
              </div>
            </div>
          )}
        </div>
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
        <Umschalter
          wert={zuschnitt.doppelseite ? "doppel" : "einzel"}
          optionen={[["einzel", "Einzelseite"], ["doppel", "Doppelseite"]]}
          onWahl={(w) => onZuschnitt({ ...zuschnitt, doppelseite: w === "doppel" })}
        />
        {knopf(automatisch, () => setAutomatisch(!automatisch), <>{automatisch ? <Zap size={16} /> : <ZapOff size={16} />} Nach dem Umblättern von selbst</>)}
        {knopf(randAuto, () => onZuschnitt({ ...zuschnitt, randAuto: !randAuto }), <><Crop size={16} /> Rand automatisch</>)}
        {knopf(undefined, drehen, <><RotateCw size={16} /> Drehen</>)}
        {knopf(undefined, () => onVollbild(true), <><Maximize2 size={16} /> Vollbild</>)}
      </div>
      {randText && <p className="text-xs text-muted-foreground">{randText}</p>}
      {einstellungsListe(false)}
      {automatisch && (
        <p className="text-xs text-muted-foreground">
          Blättere um und nimm die Hand aus dem Bild. Steht das Bild einen Moment still, wird aufgenommen – mit Blitz, Haken und Ton.
        </p>
      )}
    </div>
  );
}
