interface Credit {
  description: string;
  source: string;
  license: string;
}

interface ImageCreditsProps {
  credits: Credit[];
}

const ImageCredits = ({ credits }: ImageCreditsProps) => {
  if (credits.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="font-serif text-2xl font-semibold mb-4">Bildnachweise</h2>
      <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
        {credits.map((c, i) => (
          <p key={i}>
            <span className="font-medium text-foreground/70">{c.description}:</span>{" "}
            {c.source} – {c.license}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ImageCredits;
