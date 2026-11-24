import { useQuery } from "@tanstack/react-query";
import { epochenSchluessel, ladeBesucherpunkte } from "@/daten/epochen";
import { useRahmentexte, useSprache } from "@/hooks/useSprache";

interface VisitorHighlightProps {
  epoch: string;
  intro: string;
  outro?: string;
}

const VisitorHighlight = ({ epoch, intro, outro }: VisitorHighlightProps) => {
  // Feste Worte aus texte.ts; die Aufzählung aus der Verwaltung, übersetzt
  // über site_text_translations (Art „visitor").
  const { t } = useSprache();
  const uebersetzt = useRahmentexte();
  const { data: items = [] } = useQuery({
    queryKey: epochenSchluessel.besucherpunkte(epoch),
    queryFn: () => ladeBesucherpunkte(epoch),
  });

  return (
    <div className="mb-12 p-8 rounded-xl bg-primary/5 border border-primary/20">
      <h2 className="font-serif text-2xl font-semibold mb-6 text-primary">{t.besucherTitel}</h2>
      <div className="leading-relaxed space-y-4">
        <p className="text-foreground/80">{intro}</p>
        <p className="text-foreground/80">{t.besucherDazu}</p>
        {items.length > 0 ? (
          <ul className="space-y-3 ml-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-primary mt-1 font-bold">•</span>
                <span className="text-foreground/80">{uebersetzt[`visitor:${item.id}`] ?? item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/60 italic">{t.besucherLeer}</p>
        )}
        {outro && <p className="text-foreground/80">{outro}</p>}
      </div>
    </div>
  );
};

export default VisitorHighlight;
