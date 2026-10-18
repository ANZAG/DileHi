import { supabase } from "@/integrations/supabase/client";
import { fassungPfad, noetigeBreiten } from "@/lib/bildfassungen.mjs";
import { fassungenZeichnen } from "@/lib/imageConversion";

/**
 * Ein Bild in die Ablage „gallery" legen – samt seinen kleineren Fassungen.
 *
 * Gibt zurück, was in die Bildzeile gehört: Masse und die Breiten der
 * Fassungen, die tatsächlich angekommen sind. Scheitert eine Fassung, fehlt
 * sie in der Liste, und die Seite nimmt an ihrer Stelle das Original. Nur das
 * Original selbst muss ankommen.
 */
export async function bildAblegen(
  pfad: string, datei: File,
): Promise<{ breite: number | null; hoehe: number | null; fassungen: number[] }> {
  const ablage = supabase.storage.from("gallery");
  const { error } = await ablage.upload(pfad, datei, { contentType: datei.type || "image/webp" });
  if (error) throw new Error(error.message);

  try {
    const gezeichnet = await fassungenZeichnen(datei, noetigeBreiten);
    const angekommen = await Promise.all(gezeichnet.fassungen.map(async (f) => {
      const { error: fehler } = await ablage.upload(fassungPfad(pfad, f.breite), f.datei, {
        contentType: "image/webp", upsert: true,
      });
      return fehler ? null : f.breite;
    }));
    return {
      breite: gezeichnet.breite,
      hoehe: gezeichnet.hoehe,
      fassungen: angekommen.filter((b): b is number => b !== null),
    };
  } catch {
    // Ohne Fassungen geht es auch – nur langsamer auf dem Handy.
    return { breite: null, hoehe: null, fassungen: [] };
  }
}

/** Ein Bild aus der Ablage entfernen, samt seinen Fassungen. */
export async function bildEntfernen(pfad: string, fassungen: number[] | null | undefined) {
  await supabase.storage.from("gallery").remove([pfad, ...(fassungen ?? []).map((b) => fassungPfad(pfad, b))]);
}
