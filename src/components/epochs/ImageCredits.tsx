import { useSprache } from "@/hooks/useSprache";
import { lizenzwort } from "@/lib/texte";

interface Credit {
  description: string;
  source: string;
  license: string;
}

interface ImageCreditsProps {
  credits: Credit[];
}

/**
 * Beschreibung und Quelle stehen in der Seite und werden mit ihr übersetzt.
 * Die Lizenz nicht – „CC BY-SA 4.0" bleibt in jeder Sprache so. Nur die
 * gängigen deutschen Angaben („gemeinfrei") kennt die Anwendung in allen
 * drei Sprachen (lizenzwort).
 */
const ImageCredits = ({ credits }: ImageCreditsProps) => {
  const { t } = useSprache();
  if (credits.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="font-serif text-2xl font-semibold mb-4">{t.bildnachweise}</h2>
      <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
        {credits.map((c, i) => (
          <p key={i}>
            <span className="font-medium text-foreground/70">{c.description}:</span>{" "}
            {c.source} – {lizenzwort(c.license ?? "", t)}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ImageCredits;
