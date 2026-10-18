import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { vorabzug } from "@/lib/vorabzug";
import type { GespeichertesBild } from "@/components/SpeicherBild";

/**
 * Die Bilder der Seitenbausteine.
 *
 * Jeder Platz (`site_images.slot`) trägt eine Datei aus dem Speicher des
 * eigenen Projekts. Mehr nicht — und das ist der Punkt.
 *
 * Bis zum 17. September lagen hier 18 mitgelieferte Fotos als Notnagel:
 * 4,6 MB, die DileHi gehören, ausgeliefert an jede Installation. Wo ein
 * Verein kein eigenes Bild hochgeladen hatte, zeigte die Seite unseres. Für
 * DileHi selbst waren sie damit die Bilder der eigenen Website, was das
 * Löschen lange verhinderte; `scripts/bilder-umziehen.mjs` hat sie einmalig in
 * den eigenen Speicher gelegt (22 Plätze, alle nachweislich erreichbar), und
 * seitdem gibt es hier nichts mehr zu vererben.
 *
 * Ohne hinterlegte Datei bleibt `src` leer. Die Bausteine kennen das: Sie
 * zeigen dann einen Verlauf aus der Vereinsfarbe statt eines kaputten Bildes
 * (siehe FARBGRUND in components/sitebuilder/gestaltung.ts).
 */

type SiteImageData = GespeichertesBild;

/** Alle Bilder auf einmal – die Bausteine fragen daraus einzeln ab. */
export function useSiteImages() {
  return useQuery({
    queryKey: ["site_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_images")
        .select("*");
      if (error) return {} as Record<string, SiteImageData>;

      const map: Record<string, SiteImageData> = {};
      for (const img of data) {
        const src = img.storage_path
          ? supabase.storage.from("gallery").getPublicUrl(img.storage_path).data.publicUrl
          : "";
        // Masse und Fassungen für srcset und den freigehaltenen Platz
        // (components/SpeicherBild.tsx).
        map[img.slot] = { src, alt: img.alt_text || "", breite: img.breite, hoehe: img.hoehe, fassungen: img.fassungen };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
    // Der Stand vom Bauen, damit die Bilder sofort eine Adresse haben. Als
    // veraltet markiert (Zeitpunkt 0): Die Abfrage läuft trotzdem gleich im
    // Hintergrund, und ein neues Bild seit dem Bauen erscheint wie bisher.
    initialData: () => vorabzug()?.bilder,
    initialDataUpdatedAt: 0,
  });
}

/** Ein einzelner Platz. Ohne Bild: leere Adresse, kein Ersatz. */
export function useSiteImage(slot: string): SiteImageData {
  const { data } = useSiteImages();
  return data?.[slot] ?? { src: "", alt: "" };
}
