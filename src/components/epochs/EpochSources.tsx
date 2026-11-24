import { useQuery } from "@tanstack/react-query";
import { epochenSchluessel, ladeEpochenquellen } from "@/daten/epochen";
import { useRahmentexte, useSprache } from "@/hooks/useSprache";
import { betonung } from "@/lib/betonung";

interface EpochSourcesProps {
  epoch: string;
}

/**
 * Die Quellen einer Darstellung.
 *
 * Überschrift, Einleitung und Schlusssatz sind feste Worte und stehen in
 * allen drei Sprachen in src/lib/texte.ts. Die Einträge kommen aus der
 * Verwaltung (Quellen); ihre Übersetzung liegt in site_text_translations
 * (Art „source"). Ohne Übersetzung bleibt ein Eintrag deutsch – bei einer
 * Literaturangabe ist das die richtige Fassung.
 */
const EpochSources = ({ epoch }: EpochSourcesProps) => {
  const { t } = useSprache();
  const uebersetzt = useRahmentexte();
  const { data = [] } = useQuery({
    queryKey: epochenSchluessel.quellen(epoch),
    queryFn: () => ladeEpochenquellen(epoch),
  });
  const sources = data.map((s) => ({ ...s, text: uebersetzt[`source:${s.id}`] ?? s.text }));

  return (
    <div className="mb-12">
      <h2 className="font-serif text-2xl font-semibold mb-6">{t.quellenTitel}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-4">
        <p>{t.quellenEinleitung}</p>
        {sources.length > 0 ? (
          <ul className="space-y-3 ml-1 text-sm">
            {sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span dangerouslySetInnerHTML={{ __html: betonung(s.text) }} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic">{t.quellenLeer}</p>
        )}
        <p className="text-sm italic">{t.quellenAbschluss}</p>
      </div>
    </div>
  );
};

export default EpochSources;
