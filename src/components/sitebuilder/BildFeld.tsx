import { useEffect, useState } from "react";
import { FieldLabel } from "@puckeditor/core";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { convertToWebP } from "@/lib/imageConversion";
import { bildVorschauen, leereAuswahlMerker, leereVorschauMerker, type BildVorschau } from "./auswahl";

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
  const [bilder, setBilder] = useState<BildVorschau[]>([]);
  const [suche, setSuche] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    bildVorschauen().then((b) => {
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
      leereVorschauMerker();
      setBilder(await bildVorschauen());
      onChange(slot);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLaedt(false);
    }
  };

  const bekannt = bilder.some((b) => b.slot === value);
  const gewaehlt = bilder.find((b) => b.slot === value);

  const gefiltert = suche.trim()
    ? bilder.filter((b) =>
        `${b.label} ${b.page ?? ""} ${b.slot}`.toLowerCase().includes(suche.toLowerCase())
      )
    : bilder;

  return (
    <FieldLabel label="Bild">
      {/* Das gewaehlte Bild oben, gross genug zum Erkennen. Vorher stand hier
          eine Auswahlliste aus Namen – „transition-gruppenfoto" verraet nicht,
          wie das Bild aussieht, und wer eine Seite baut, waehlt nach dem Bild. */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 mb-2">
        {gewaehlt?.src ? (
          <img
            src={gewaehlt.src}
            alt=""
            className="h-14 w-20 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-14 w-20 rounded bg-muted flex items-center justify-center shrink-0">
            <ImagePlus size={16} className="text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {gewaehlt?.label ?? (value ? value : "Kein Bild")}
          </p>
          {value && !bekannt && (
            // Ein gespeichertes Bild, das es nicht mehr gibt, bleibt sichtbar.
            // Sonst stuende das Feld leer und der naechste Klick ueberschriebe
            // den Wert, ohne dass jemand merkt, was verloren geht.
            <p className="text-xs text-destructive">nicht mehr vorhanden</p>
          )}
          {gewaehlt?.page && (
            <p className="text-xs text-muted-foreground truncate">{gewaehlt.page}</p>
          )}
        </div>
        {value && !readOnly && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground hover:text-destructive shrink-0"
          >
            entfernen
          </button>
        )}
      </div>

      {!readOnly && (
        <>
          {bilder.length > 8 && (
            <input
              type="text"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Suchen …"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm mb-2"
            />
          )}

          <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto rounded-md border p-1.5">
            {gefiltert.map((b) => (
              <button
                key={b.slot}
                type="button"
                title={b.page ? `${b.label} (${b.page})` : b.label}
                onClick={() => onChange(b.slot)}
                className={`group relative aspect-[4/3] overflow-hidden rounded transition-all ${
                  b.slot === value
                    ? "ring-2 ring-primary ring-offset-1"
                    : "hover:opacity-80"
                }`}
              >
                {b.src ? (
                  <img src={b.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground px-1 text-center">
                    {b.label}
                  </span>
                )}
                {/* Der Name erst beim Ueberfahren: Sonst verdeckt Text die
                    Bilder, und genau die will man ja sehen. */}
                <span className="absolute inset-x-0 bottom-0 bg-background/85 px-1 py-0.5 text-[10px] leading-tight opacity-0 transition-opacity group-hover:opacity-100 truncate">
                  {b.label}
                </span>
              </button>
            ))}
            {gefiltert.length === 0 && (
              <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                Kein Bild gefunden.
              </p>
            )}
          </div>

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
        </>
      )}

      {fehler && <p className="mt-1 text-xs text-destructive">{fehler}</p>}
    </FieldLabel>
  );
}
