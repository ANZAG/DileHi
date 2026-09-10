import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Antragstext {
  titel: string;
  inhalt: string;
}

/**
 * Die Textbausteine des Aufnahmeantrags.
 *
 * Dieselben Zeilen, die auf dem gedruckten Antrag stehen. Vorher hatte das
 * Webformular eigene Zustimmungssätze und das PDF eigene – wer zustimmte, las
 * also den einen Text, protokolliert wurde der andere. Für eine Erklärung, mit
 * der jemand einem Verein beitritt, ist das keine Kleinigkeit.
 *
 * Ohne Anmeldung lesbar: Ein Aufnahmeantrag wird von jemandem ausgefüllt, der
 * noch kein Konto hat.
 */
export function useAntragstexte(): Record<string, Antragstext> {
  const { data } = useQuery({
    queryKey: ["pdf-texts-oeffentlich"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => Promise<{
            data: { key: string; titel: string; inhalt: string }[] | null;
            error: { message: string } | null;
          }>;
        };
      })
        .from("pdf_texts")
        .select("key, titel, inhalt");
      if (error) throw new Error(error.message);
      return Object.fromEntries(
        (data ?? []).map((z) => [z.key, { titel: z.titel, inhalt: z.inhalt }])
      );
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  return data ?? {};
}

/** Ersetzt {{name}} durch den Wert – dieselbe Regel wie im Backend. */
export function fuelleText(text: string, werte: Record<string, string>): string {
  return (text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (ganz, name: string) =>
    // Unbekannte Platzhalter bleiben stehen: {{satzung}} wird erst beim
    // Darstellen zum Verweis, und ein spurlos verschwundener Platzhalter
    // waere schwerer zu finden als ein sichtbarer.
    name in werte ? werte[name] : ganz
  );
}
