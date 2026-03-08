import { ReactNode } from "react";

interface VisitorHighlightProps {
  intro: string;
  items: string[];
  outro?: string;
}

const VisitorHighlight = ({ intro, items, outro }: VisitorHighlightProps) => {
  return (
    <div className="mb-12 p-8 rounded-xl bg-primary/5 border border-primary/20">
      <h2 className="font-serif text-2xl font-semibold mb-6 text-primary">Was Besucher bei uns erleben können</h2>
      <div className="leading-relaxed space-y-4">
        <p className="text-foreground/80">{intro}</p>
        <p className="text-foreground/80">Dazu gehören unter anderem:</p>
        <ul className="space-y-3 ml-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1 font-bold">•</span>
              <span className="text-foreground/80">{item}</span>
            </li>
          ))}
        </ul>
        {outro && <p className="text-foreground/80">{outro}</p>}
      </div>
    </div>
  );
};

export default VisitorHighlight;
