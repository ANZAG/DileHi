import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Drehung } from "@/lib/scan/geometrie";
import type { Zuschnitt } from "@/lib/scan/verarbeitungKern";
import { ViereckEditor } from "./ViereckEditor";

/**
 * Eine einzelne Aufnahme neu zuschneiden – wenn das Buch verrutscht ist oder
 * ein Foto aus der Hand schief geraten ist. Gezeigt wird das ursprüngliche
 * Kamerabild, gedreht wie eingestellt.
 */

interface Props {
  roh: Blob | null;
  zuschnitt: Zuschnitt | null;
  onSchliessen: () => void;
  onUebernehmen: (z: Zuschnitt) => void;
}

export function NeuZuschneiden({ roh, zuschnitt, onSchliessen, onUebernehmen }: Props) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const [z, setZ] = useState<Zuschnitt | null>(zuschnitt);

  useEffect(() => setZ(zuschnitt), [zuschnitt]);

  useEffect(() => {
    if (!roh || !z) return;
    let aktiv = true;
    createImageBitmap(roh).then((bmp) => {
      const c = leinwand.current;
      if (!aktiv || !c) { bmp.close(); return; }
      const quer = z.drehung === 90 || z.drehung === 270;
      const bw = quer ? bmp.height : bmp.width;
      const bh = quer ? bmp.width : bmp.height;
      const m = Math.min(1, 1200 / Math.max(bw, bh));
      c.width = Math.round(bw * m);
      c.height = Math.round(bh * m);
      const ctx = c.getContext("2d")!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate((z.drehung * Math.PI) / 180);
      ctx.drawImage(bmp, (-bmp.width * m) / 2, (-bmp.height * m) / 2, bmp.width * m, bmp.height * m);
      bmp.close();
    });
    return () => { aktiv = false; };
  }, [roh, z?.drehung]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!roh && !!z} onOpenChange={(offen) => !offen && onSchliessen()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Neu zuschneiden</DialogTitle>
        </DialogHeader>
        {z && (
          <div className="space-y-3">
            <div className="relative">
              <canvas ref={leinwand} className="block w-full h-auto rounded border" />
              <ViereckEditor
                viereck={z.viereck}
                onViereck={(viereck) => setZ({ ...z, viereck })}
                bund={z.doppelseite ? z.bund : null}
                onBund={(bund) => setZ({ ...z, bund })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setZ({ ...z, drehung: ((z.drehung + 90) % 360) as Drehung })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted"
              >
                <RotateCw size={16} /> Drehen
              </button>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={z.doppelseite} onChange={(e) => setZ({ ...z, doppelseite: e.target.checked })} />
                Doppelseite teilen
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={z.farbig} onChange={(e) => setZ({ ...z, farbig: e.target.checked })} />
                Farbig
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={z.finger !== false} onChange={(e) => setZ({ ...z, finger: e.target.checked })} />
                Finger entfernen
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={z.glaetten === true} onChange={(e) => setZ({ ...z, glaetten: e.target.checked })} />
                Glätten
              </label>
              <div className="flex-1" />
              <button type="button" onClick={onSchliessen} className="px-3 py-2 rounded-md border hover:bg-muted">Abbrechen</button>
              <button type="button" onClick={() => onUebernehmen(z)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                Übernehmen
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
