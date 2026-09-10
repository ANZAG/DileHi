import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Ruler, Trash2, Upload, X } from "lucide-react";

interface Props {
  eventId: string;
  formId: string;
  mapImagePath?: string | null;
  mapScale?: number | null;
  onChange: (patch: { map_image_path?: string | null; map_scale?: number | null }) => void;
}

interface Point {
  x: number;
  y: number;
}

export default function EventMapSettings({ eventId, formId, mapImagePath, mapScale, onChange }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [realMeters, setRealMeters] = useState<string>("");
  const [directScale, setDirectScale] = useState<string>(mapScale ? String(mapScale) : "");

  // Lade Vorschaubild, wenn bereits ein Bild hinterlegt ist
  useEffect(() => {
    if (!mapImagePath) {
      setPreviewUrl(null);
      setImageSize(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage.from("internal-files").createSignedUrl(mapImagePath, 600);
      if (error || !data?.signedUrl) return;
      if (cancelled) return;
      setPreviewUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [mapImagePath]);

  // Wenn sich das Bild ändert, Punkte zurücksetzen
  useEffect(() => {
    setPoints([]);
    setRealMeters("");
  }, [previewUrl]);

  const pixelDistance = () => {
    if (points.length < 2 || !imageSize) return 0;
    const dx = (points[1].x - points[0].x) * imageSize.width;
    const dy = (points[1].y - points[0].y) * imageSize.height;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const computedScale = () => {
    const px = pixelDistance();
    const m = parseFloat(realMeters.replace(",", "."));
    if (px > 0 && m > 0) return px / m;
    return undefined;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ungültiges Format", description: "Bitte ein Bild hochladen (JPG/PNG/WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Datei zu groß", description: "Maximal 10 MB erlaubt.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Altes Bild löschen, falls vorhanden
      if (mapImagePath) {
        await supabase.storage.from("internal-files").remove([mapImagePath]);
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `event-maps/${eventId}/${formId}.${ext}`;
      const { error } = await supabase.storage.from("internal-files").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;

      onChange({ map_image_path: path, map_scale: mapScale ?? undefined });
      toast({ title: "Kartenbild hochgeladen" });
    } catch (err: any) {
      toast({ title: "Fehler beim Upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!mapImagePath) return;
    try {
      await supabase.storage.from("internal-files").remove([mapImagePath]);
      onChange({ map_image_path: null, map_scale: null });
      toast({ title: "Kartenbild entfernt" });
    } catch (err: any) {
      toast({ title: "Fehler beim Löschen", description: err.message, variant: "destructive" });
    }
  };

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (!img) return;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (points.length >= 2) {
      setPoints([{ x, y }]);
    } else {
      setPoints([...points, { x, y }]);
    }
  };

  const applyReferenceScale = () => {
    const scale = computedScale();
    if (!scale) {
      toast({ title: "Maßstab nicht berechenbar", description: "Bitte zwei Punkte setzen und eine reale Länge eingeben.", variant: "destructive" });
      return;
    }
    onChange({ map_scale: scale });
    setDirectScale(String(scale.toFixed(2)));
    toast({ title: "Maßstab übernommen", description: `${scale.toFixed(2)} Pixel = 1 m` });
  };

  const applyDirectScale = () => {
    const scale = parseFloat(directScale.replace(",", "."));
    if (!scale || scale <= 0) {
      toast({ title: "Ungültiger Maßstab", description: "Bitte eine positive Zahl eingeben.", variant: "destructive" });
      return;
    }
    onChange({ map_scale: scale });
    toast({ title: "Maßstab übernommen", description: `${scale.toFixed(2)} Pixel = 1 m` });
  };

  const hasScale = typeof mapScale === "number" && mapScale > 0;

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        <h3 className="font-semibold text-sm">Lagerplan-Karte (Hintergrundbild)</h3>
      </div>

      {!mapImagePath ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Kartenbild hochladen (z. B. Screenshot, Luftbild, Skizze)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-1" /> {uploading ? "Wird hochgeladen..." : "Bild auswählen"}
          </Button>
          <p className="text-xs text-muted-foreground">Max. 10 MB. Das Bild erscheint im Lagerplan hinter den Zelten.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative inline-block max-w-full">
            {previewUrl ? (
              <>
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Kartenbild"
                  className="max-w-full max-h-64 object-contain border rounded cursor-crosshair"
                  onLoad={handleImageLoad}
                  onClick={handleImageClick}
                />
                {/* Referenzpunkte und Linie */}
                {points.map((p, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-primary border-2 border-background shadow"
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                    title={i === 0 ? "Startpunkt" : "Endpunkt"}
                  />
                ))}
                {points.length === 2 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ left: 0, top: 0 }}
                  >
                    <line
                      x1={`${points[0].x * 100}%`}
                      y1={`${points[0].y * 100}%`}
                      x2={`${points[1].x * 100}%`}
                      y2={`${points[1].y * 100}%`}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                )}
                <button
                  onClick={handleRemove}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded shadow hover:bg-destructive/90"
                  title="Bild entfernen"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center border rounded bg-muted text-sm text-muted-foreground">
                Vorschau lädt...
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Ruler size={16} className="text-primary" />
              <span className="text-sm font-medium">Maßstab angeben</span>
            </div>

            {/* Variante A: Referenzstrecke */}
            <div className="space-y-2 p-3 border rounded bg-muted/30">
              <Label className="text-xs font-semibold">Variante 1: Referenzstrecke auf dem Bild</Label>
              <p className="text-xs text-muted-foreground">
                1. Zwei Punkte auf dem Bild klicken (z. B. eine bekannte Kante).<br />
                2. Reale Länge dieser Strecke eingeben.
              </p>
              {points.length === 2 && imageSize && (
                <p className="text-xs text-muted-foreground">
                  Gemessene Strecke: <strong>{pixelDistance().toFixed(1)} Pixel</strong>
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Reale Länge in m"
                  value={realMeters}
                  onChange={(e) => setRealMeters(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyReferenceScale}
                  disabled={points.length < 2 || !realMeters}
                >
                  Übernehmen
                </Button>
              </div>
              {points.length === 0 && (
                <p className="text-xs text-primary">Tipp: Auf das Bild klicken, um den ersten Punkt zu setzen.</p>
              )}
              {points.length === 1 && (
                <p className="text-xs text-primary">Tipp: Zweiten Punkt auf das Bild klicken.</p>
              )}
              {points.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setPoints([])}
                >
                  <Trash2 size={12} className="mr-1" /> Punkte zurücksetzen
                </Button>
              )}
            </div>

            {/* Variante B: Direkteingabe */}
            <div className="space-y-2 p-3 border rounded bg-muted/30">
              <Label className="text-xs font-semibold">Variante 2: Direkteingabe</Label>
              <p className="text-xs text-muted-foreground">Pixel pro Meter (px/m). Beispiel: 100 Pixel = 1 m → 100</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="px/m"
                  value={directScale}
                  onChange={(e) => setDirectScale(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="secondary" onClick={applyDirectScale} disabled={!directScale}>
                  Übernehmen
                </Button>
              </div>
            </div>

            {hasScale && (
              <p className="text-xs text-muted-foreground">
                Aktiver Maßstab: <strong>{mapScale.toFixed(2)} Pixel = 1 m</strong>.
                Ein Zelt von 3 m Breite wird im Lagerplan {(mapScale * 3).toFixed(0)} Pixel breit dargestellt.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
