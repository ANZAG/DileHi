import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Zwei Sätze Erklärung, direkt neben dem Feld.
 *
 * Eine Einführung vorab beantwortet Fragen, die noch niemand hat. Wer den
 * Zeltabstand eintippt, fragt sich in diesem Moment, was gemeint ist – und
 * nicht drei Wochen vorher beim ersten Anmelden.
 *
 * Die Texte stehen in der Datenbank (`onboarding_help`) und lassen sich unter
 * Verwaltung → System anpassen. Ein Verein, der andere Worte für seine Dinge
 * benutzt, soll sie hier hinschreiben können.
 *
 * Gibt es zum Schlüssel keinen Text, erscheint gar nichts. Ein Fragezeichen,
 * das nichts erklärt, ist schlimmer als keines.
 *
 *   <Label>Zeltmasse <Hilfe k="zeltmasse" /></Label>
 */
export function Hilfe({ k }: { k: string }) {
  const { data } = useQuery({
    queryKey: ["onboarding-hilfe"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("onboarding_help")
        .select("key, title, text");
      if (error) throw new Error(error.message);
      return (data ?? []) as { key: string; title: string | null; text: string }[];
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const eintrag = data?.find((h) => h.key === k);
  if (!eintrag) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={eintrag.title ? `Hilfe: ${eintrag.title}` : "Hilfe"}
          className="inline-flex align-middle text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          <HelpCircle size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        {eintrag.title && <p className="font-medium mb-1">{eintrag.title}</p>}
        <p className="text-muted-foreground leading-relaxed">{eintrag.text}</p>
      </PopoverContent>
    </Popover>
  );
}

export default Hilfe;
