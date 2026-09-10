import { supabase } from "@/integrations/supabase/client";
import { SITE_IMAGE_FALLBACKS } from "@/hooks/useSiteImage";

/**
 * Auswahllisten für die Bausteine.
 *
 * Vorher standen in den Bausteinen freie Textfelder für „Bildschlüssel" und
 * „Epoche" – man musste die Kürzel auswendig kennen. Selbst wer die Seite
 * gebaut hat, kennt sie nicht. Jetzt lädt Puck die Möglichkeiten über
 * `resolveFields` direkt aus der Datenbank.
 *
 * Die Ergebnisse werden gemerkt: `resolveFields` läuft bei jeder Änderung an
 * einem Baustein, und dreimal pro Tastendruck die Bilderliste zu holen wäre
 * spürbar.
 */

export interface Auswahl {
  label: string;
  value: string;
}

const merker = new Map<string, { zeit: number; werte: Auswahl[] }>();
const HALTBARKEIT = 60_000;

async function gemerkt(schluessel: string, laden: () => Promise<Auswahl[]>): Promise<Auswahl[]> {
  const treffer = merker.get(schluessel);
  if (treffer && Date.now() - treffer.zeit < HALTBARKEIT) return treffer.werte;
  try {
    const werte = await laden();
    merker.set(schluessel, { zeit: Date.now(), werte });
    return werte;
  } catch {
    // Lieber die alte Liste als gar keine – ein leeres Auswahlfeld sieht aus,
    // als gäbe es nichts.
    return treffer?.werte ?? [];
  }
}

/**
 * Die Bilder aus der Bilderverwaltung.
 *
 * Beschriftet wird mit dem sprechenden Namen und der Seite, zu der das Bild
 * gehört – „Titelbild (Startseite)" statt „hero-startseite".
 */
/** Nach dem Hochladen eines Bildes muss die gemerkte Liste weg. */
export function leereVorschauMerker() {
  vorschauMerker = null;
}

export function leereAuswahlMerker(schluessel?: string) {
  if (schluessel) merker.delete(schluessel);
  else merker.clear();
}

export function bildAuswahl(): Promise<Auswahl[]> {
  return gemerkt("bilder", async () => {
    const { data, error } = await supabase
      .from("site_images")
      .select("slot, label, page")
      .order("page")
      .order("label");
    if (error) throw new Error(error.message);
    return (data ?? []).map((b) => ({
      value: b.slot,
      label: b.page ? `${b.label} (${b.page})` : b.label,
    }));
  });
}

export interface BildVorschau {
  slot: string;
  label: string;
  page: string | null;
  /** Fertige Adresse – aus dem Speicher oder das mitgelieferte Bild. */
  src: string;
}

/**
 * Dieselben Bilder, aber mit Adresse zum Ansehen.
 *
 * Eine Auswahlliste aus Namen verraet nicht, wie ein Bild aussieht –
 * „transition-gruppenfoto" koennte alles sein. Wer eine Seite baut, waehlt
 * nach dem Bild, nicht nach dem Namen.
 */
let vorschauMerker: { zeit: number; werte: BildVorschau[] } | null = null;

export async function bildVorschauen(): Promise<BildVorschau[]> {
  if (vorschauMerker && Date.now() - vorschauMerker.zeit < HALTBARKEIT) {
    return vorschauMerker.werte;
  }
  const laden = async (): Promise<BildVorschau[]> => {
    const { data, error } = await supabase
      .from("site_images")
      .select("slot, label, page, storage_path")
      .order("page")
      .order("label");
    if (error) throw new Error(error.message);
    return (data ?? []).map((b) => ({
      slot: b.slot,
      label: b.label,
      page: b.page,
      src: b.storage_path
        ? supabase.storage.from("gallery").getPublicUrl(b.storage_path).data.publicUrl
        : SITE_IMAGE_FALLBACKS[b.slot] ?? "",
    }));
  };
  const werte = await laden();
  vorschauMerker = { zeit: Date.now(), werte };
  return werte;
}

/** Die Galerien – abgeleitet daraus, welche es tatsächlich gibt. */
export function galerieAuswahl(): Promise<Auswahl[]> {
  return gemerkt("galerien", async () => {
    const { data, error } = await supabase.from("gallery_images").select("epoch");
    if (error) throw new Error(error.message);
    const namen = [...new Set((data ?? []).map((g) => g.epoch).filter(Boolean))].sort();
    return namen.map((n) => ({ value: n as string, label: n as string }));
  });
}

/**
 * Die Kategorien für Galerien, Quellen und Besucher-Highlights.
 *
 * Hiess bei uns „Epoche" – das ist aber unser Wort. Die meisten Vereine
 * stellen genau eine Zeit dar und sortieren nach Themen. Verwaltet werden sie
 * jetzt in site_categories; wer dort nichts gepflegt hat, bekommt weiterhin
 * das, was in den Daten steht.
 */
export function kategorieAuswahl(): Promise<Auswahl[]> {
  return gemerkt("kategorien", async () => {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (c: string) => Promise<{ data: { key: string; label: string }[] | null; error: { message: string } | null }>;
        };
      };
    })
      .from("site_categories")
      .select("key, label")
      .order("sort_order");
    if (error) throw new Error(error.message);
    if (data && data.length > 0) return data.map((k) => ({ value: k.key, label: k.label }));

    // Notnagel, solange die Kategorien noch nicht eingespielt sind.
    const galerien = await supabase.from("gallery_images").select("epoch");
    const namen = [...new Set((galerien.data ?? []).map((g) => g.epoch).filter(Boolean))].sort();
    return (namen as string[]).map((n) => ({ value: n, label: n }));
  });
}

/** Die im Editor gebauten Seiten – für Verweise aus Knöpfen und Karten. */
export function seitenAuswahl(): Promise<Auswahl[]> {
  return gemerkt("seiten", async () => {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (c: string) => Promise<{ data: { slug: string; title: string }[] | null; error: { message: string } | null }>;
        };
      };
    })
      .from("site_pages")
      .select("slug, title")
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({ value: `/${s.slug}`, label: s.title }));
  });
}

/**
 * Ein Auswahlfeld, das auch dann etwas anzeigt, wenn der gespeicherte Wert
 * nicht mehr in der Liste steht – etwa weil ein Bild umbenannt wurde. Ohne das
 * stünde das Feld leer da und der nächste Klick würde den Wert überschreiben,
 * ohne dass jemand merkt, was verloren geht.
 */
export function mitBestehendem(werte: Auswahl[], aktuell: unknown): Auswahl[] {
  const wert = typeof aktuell === "string" ? aktuell : "";
  if (!wert || werte.some((w) => w.value === wert)) return werte;
  return [{ value: wert, label: `${wert} (nicht mehr vorhanden)` }, ...werte];
}
