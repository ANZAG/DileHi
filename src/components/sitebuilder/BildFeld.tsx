import { useEffect, useState } from "react";
import { FieldLabel } from "@puckeditor/core";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { convertToWebP } from "@/lib/imageConversion";
import { bildAuswahl, leereAuswahlMerker, type Auswahl } from "./auswahl";

/**
 * Bildauswahl mit Hochladen.
 *
 * Die Bilderverwaltung war auf feste Bildplätze ausgelegt: Jemand hat sie
 * einmal eingetragen, und der Herold konnte das Bild darin austauschen. Für
 * Seiten aus dem Editor reicht das nicht – eine neue Seite braucht neue
 * Bildplätze.
 *
 * Deshalb steht hier beides nebeneinander: die vorhandenen Bilder zum Auswählen
 * und ein Knopf zum Hochladen. Ein hochgeladenes Bild wird als neuer Platz in
 * der Bilderverwaltung angelegt und taucht dort ganz normal auf – austauschbar,
 * mit Alternativtext, mit Rückfall auf das mitgelieferte Bild, wenn die Datei
 * gelöscht wird. Es geht also keine Funktion verloren, es kommt eine dazu.
 */
export default function BildFeld({
  value,
  onChange,
  seitentitel,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  seitentitel: string;
  readOnly?: boolean;
}) {
  const [bilder, setBilder] = useState<Auswahl[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    bildAuswahl().then((b) => {
      if (!abgebrochen) setBilder(b);
    });
    return () => { abgebrochen = true; };
  }, []);

  const hochladen = async (datei: File | undefined) => {
    if (!datei) return;
    setLaedt(true);
    setFehler(null);
    try {
      // Wie in der Bilderverwaltung: WebP spart auf einer Vereinsseite mit
      // vielen Fotos spürbar Ladezeit.
      const webp = await convertToWebP(datei);
      const pfad = `site/${Date.now()}_${webp.name}`;
      const { error: uploadFehler } = await supabase.storage
        .from("gallery")
        .upload(pfad, webp, { contentType: "image/webp" });
      if (uploadFehler) throw new Error(uploadFehler.message);

      // Der Schlüssel muss eindeutig sein und lesbar bleiben – er steht später
      // in der Bilderverwaltung.
      const basis = datei.name.replace(/\.[^.]+$/, "").toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "bild";
      const slot = `${basis}-${Date.now().toString(36)}`;

      const { error: zeileFehler } = await supabase.from("site_images").insert({
        slot,
        label: datei.name.replace(/\.[^.]+$/, ""),
        page: seitentitel || "Seiten",
        storage_path: pfad,
        alt_text: "",
      });
      if (zeileFehler) throw new Error(zeileFehler.message);

      // Die Auswahlliste ist gemerkt; ohne Leeren fehlt das neue Bild.
      leereAuswahlMerker("bilder");
      setBilder(await bildAuswahl());
      onChange(slot);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLaedt(false);
    }
  };

  const bekannt = bilder.some((b) => b.value === value);

  return (
    <FieldLabel label="Bild">
      <select
        value={value ?? ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      >
        <option value="">— kein Bild —</option>
        {/* Ein gespeichertes Bild, das es nicht mehr gibt, bleibt sichtbar.
            Sonst stünde das Feld leer und der nächste Klick überschriebe den
            Wert, ohne dass jemand merkt, was verloren geht. */}
        {value && !bekannt && <option value={value}>{value} (nicht mehr vorhanden)</option>}
        {bilder.map((b) => (
          <option key={b.value} value={b.value}>{b.label}</option>
        ))}
      </select>

      {!readOnly && (
        <label
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground
            cursor-pointer hover:text-foreground"
        >
          {laedt ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
          {laedt ? "Wird hochgeladen …" : "Neues Bild hochladen"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={laedt}
            onChange={(e) => {
              void hochladen(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {fehler && <p className="mt-1 text-xs text-destructive">{fehler}</p>}
    </FieldLabel>
  );
}
