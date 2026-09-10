import { Compass, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding, fuehrungStarten } from "./useOnboarding";

/**
 * Das Angebot einer Einführung – als Streifen, nicht als Fenster.
 *
 * Die Vorgängerfassung legte sich beim ersten Besuch über die Seite. Wer
 * gerade etwas vorhatte, musste erst wegklicken. Ein Streifen über dem Inhalt
 * fragt, statt zu übernehmen: Er ist zu sehen, aber er hält niemanden auf.
 *
 * Er erscheint nur, solange die Tour unberührt ist. Wer einen Schritt gesehen
 * oder das Angebot weggeklickt hat, bekommt ihn nicht wieder – gefunden hat er
 * sie ja. Erreichbar bleibt sie über das Fragezeichen daneben und über das
 * Profil.
 */
export function NeuHier({ tour, text }: { tour: string; text?: string }) {
  const { streifenOffen, streifenSchliessen } = useOnboarding();
  const { toast } = useToast();

  if (!streifenOffen(tour)) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <Compass size={18} className="text-primary shrink-0" />
      <p className="text-sm flex-1 min-w-40">
        {text ?? "Neu hier? Ich zeige dir in zwei Minuten, was wo liegt."}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={() => fuehrungStarten(tour)}>
          Zeig mir das
        </Button>
        <button
          onClick={() => {
            streifenSchliessen(tour);
            // Wer wegklickt, meint es meistens so – aber er soll wissen, wo
            // die Einfuehrung liegt, falls er sie doch noch braucht.
            toast({
              title: "Alles klar",
              description: "Die Einführung findest du jederzeit in deinem Profil.",
            });
          }}
          aria-label="Angebot ausblenden"
          title="Später – über dein Profil findest du es wieder"
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Das Fragezeichen im Kopf eines Bereichs.
 *
 * Die Einführung soll auch dann noch auffindbar sein, wenn der Streifen weg
 * ist – und beim fünften Mal, wenn man etwas vergessen hat. Gibt es für den
 * Bereich nichts zu zeigen (abgeschaltetes Modul, fehlendes Recht),
 * erscheint es nicht.
 */
export function TourKnopf({ tour, titel = "Einführung" }: { tour: string; titel?: string }) {
  const { schritteFuer, bereit } = useOnboarding();

  if (!bereit || schritteFuer(tour).length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => fuehrungStarten(tour)}
      aria-label={titel}
      title={titel}
      className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <HelpCircle size={15} />
      <span className="sr-only sm:not-sr-only">{titel}</span>
    </button>
  );
}

export default NeuHier;
