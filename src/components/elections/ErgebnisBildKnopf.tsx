import { useState } from "react";
import { ImageDown, Loader2 } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import { herunterladen, type Ergebnis } from "@/lib/ergebnisBild";

/**
 * Knopf „Als Bild" für ein Ergebnis oder alle Ergebnisse eines Themas.
 *
 * Vereinsname, Farbe und Schriften kommen aus dem Erscheinungsbild, damit das
 * Bild im Protokoll zum Verein passt. Ohne geschlossene Abstimmung gibt es
 * nichts zu zeigen, dann erscheint der Knopf nicht.
 */
export default function ErgebnisBildKnopf({ thema, ergebnisse, label = "Als Bild" }: {
  thema: string | null;
  ergebnisse: Ergebnis[];
  label?: string;
}) {
  const branding = useBranding();
  const { toast } = useToast();
  const [laeuft, setLaeuft] = useState(false);

  if (ergebnisse.length === 0) return null;

  const erzeugen = async () => {
    setLaeuft(true);
    try {
      await herunterladen(
        { verein: branding.org_name, thema, ergebnisse },
        { farbe: branding.color_primary, schriftTitel: branding.font_headings, schriftText: branding.font_body }
      );
    } catch (err) {
      toast({
        title: "Kein Bild",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <button
      type="button"
      onClick={erzeugen}
      disabled={laeuft}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted disabled:opacity-50 shrink-0"
      title="Ergebnis als PNG herunterladen, etwa fürs Protokoll"
    >
      {laeuft ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
      {label}
    </button>
  );
}
