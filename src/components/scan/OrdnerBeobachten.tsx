import { useEffect, useRef, useState } from "react";
import { FolderSearch, FolderSync, Square } from "lucide-react";
import { istTiff, Ordnerwache, type DateiStand } from "@/lib/scan/ordner";
import { merkerLaden, merkerSpeichern } from "@/lib/scan/speicher";

/**
 * „Ordner beobachten": Die Software eines Buchscanners legt ihre Seiten in
 * einen Ordner, diese Seite holt jede neue ab (Regeln in lib/scan/ordner.ts).
 *
 * Den Ordner merkt sich der Browser. Nach dem Neuladen muss er nur noch
 * einmal freigegeben werden – das verlangt der Browser so, mit einem Klick.
 */

// File System Access steht nicht in lib.dom – nur das, was hier gebraucht wird.
interface Eintrag { kind: "file" | "directory"; name: string; getFile?: () => Promise<File> }
interface Ordner {
  name: string;
  values: () => AsyncIterable<Eintrag>;
  queryPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
}
type Waehler = (o: { id?: string; mode?: "read" }) => Promise<Ordner>;

const MERKER = "ordner";
const TAKT = 2000;

const kannEs = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

async function dateien(ordner: Ordner): Promise<{ stand: DateiStand[]; holen: Map<string, () => Promise<File>>; tiff: boolean }> {
  const stand: DateiStand[] = [];
  const holen = new Map<string, () => Promise<File>>();
  let tiff = false;
  for await (const e of ordner.values()) {
    if (e.kind !== "file" || !e.getFile) continue;
    if (istTiff(e.name)) { tiff = true; continue; }
    const f = await e.getFile();
    stand.push({ name: f.name, groesse: f.size, geaendert: f.lastModified });
    holen.set(f.name, e.getFile.bind(e));
  }
  return { stand, holen, tiff };
}

interface Props {
  onBild: (datei: File) => void;
}

export function OrdnerBeobachten({ onBild }: Props) {
  const [gemerkt, setGemerkt] = useState<Ordner | null>(null);
  const [aktiv, setAktiv] = useState<Ordner | null>(null);
  const [alteMit, setAlteMit] = useState(false);
  const [zahl, setZahl] = useState(0);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const onBildRef = useRef(onBild);
  onBildRef.current = onBild;

  useEffect(() => {
    if (kannEs()) void merkerLaden<Ordner>(MERKER).then((o) => o && setGemerkt(o));
  }, []);

  // Beobachten: alle zwei Sekunden nachsehen.
  useEffect(() => {
    if (!aktiv) return;
    let lebt = true;
    let wache: Ordnerwache | null = null;
    let laeuft = false;
    const durchgang = async () => {
      if (laeuft || !lebt) return;
      laeuft = true;
      try {
        const { stand, holen, tiff } = await dateien(aktiv);
        if (tiff) setHinweis("Im Ordner liegen TIFF-Dateien. Die kann der Browser nicht lesen – stell die Scanner-Software auf JPG oder PNG.");
        if (!wache) {
          wache = new Ordnerwache(alteMit ? [] : stand);
          if (!alteMit) return;
        }
        for (const name of wache.pruefen(stand)) {
          const f = await holen.get(name)?.();
          if (f && lebt) { onBildRef.current(f); setZahl((n) => n + 1); }
        }
      } catch (err) {
        setHinweis(`Der Ordner lässt sich nicht mehr lesen: ${err instanceof Error ? err.message : String(err)}`);
        setAktiv(null);
      } finally {
        laeuft = false;
      }
    };
    void durchgang();
    const takt = setInterval(() => void durchgang(), TAKT);
    return () => { lebt = false; clearInterval(takt); };
  }, [aktiv, alteMit]);

  if (!kannEs()) return null;

  const starten = async (ordner: Ordner) => {
    setHinweis(null);
    const recht = (await ordner.queryPermission?.({ mode: "read" })) ?? "granted";
    if (recht !== "granted" && (await ordner.requestPermission?.({ mode: "read" })) !== "granted") {
      setHinweis("Ohne Erlaubnis kann die Seite den Ordner nicht lesen.");
      return;
    }
    setZahl(0);
    setAktiv(ordner);
  };

  const waehlen = async () => {
    try {
      const ordner = await (window as unknown as { showDirectoryPicker: Waehler }).showDirectoryPicker({ id: "scan-ordner", mode: "read" });
      await merkerSpeichern(MERKER, ordner);
      setGemerkt(ordner);
      await starten(ordner);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setHinweis(`Ordner nicht geöffnet: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2 text-sm">
      {aktiv ? (
        <div className="flex flex-wrap items-center gap-3">
          <FolderSync size={16} className="text-primary animate-pulse" />
          <span>Beobachte „{aktiv.name}" – {zahl} {zahl === 1 ? "Bild" : "Bilder"} übernommen.</span>
          <button type="button" onClick={() => setAktiv(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted">
            <Square size={12} /> Anhalten
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void waehlen()} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted">
            <FolderSearch size={16} /> Ordner beobachten
          </button>
          {gemerkt && (
            <button type="button" onClick={() => void starten(gemerkt)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted">
              <FolderSync size={16} /> „{gemerkt.name}" wieder beobachten
            </button>
          )}
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" checked={alteMit} onChange={(e) => setAlteMit(e.target.checked)} />
            auch Bilder, die schon im Ordner liegen
          </label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Für Buchscanner: Die Scanner-Software speichert Seiten als JPG oder PNG in einen Ordner, diese Seite übernimmt jede neue von selbst.
        Liefert die Software schon einzelne Seiten, „Doppelseite am Bund teilen" ausschalten.
      </p>
      {hinweis && <p className="text-xs text-destructive">{hinweis}</p>}
    </div>
  );
}
