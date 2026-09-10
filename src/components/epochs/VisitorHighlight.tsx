import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VisitorHighlightProps {
  epoch: string;
  intro: string;
  outro?: string;
}

const VisitorHighlight = ({ epoch, intro, outro }: VisitorHighlightProps) => {
  const { data: items = [] } = useQuery({
    queryKey: ["epoch_visitor_items", epoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epoch_visitor_items" as any)
        .select("*")
        .eq("epoch", epoch)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data as any[];
    },
  });

  return (
    <div className="mb-12 p-8 rounded-xl bg-primary/5 border border-primary/20">
      <h2 className="font-serif text-2xl font-semibold mb-6 text-primary">Was Besucher bei uns erleben können</h2>
      <div className="leading-relaxed space-y-4">
        <p className="text-foreground/80">{intro}</p>
        <p className="text-foreground/80">Dazu gehören unter anderem:</p>
        {items.length > 0 ? (
          <ul className="space-y-3 ml-1">
            {items.map((item: any) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-primary mt-1 font-bold">•</span>
                <span className="text-foreground/80">{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/60 italic">Inhalte werden in Kürze ergänzt.</p>
        )}
        {outro && <p className="text-foreground/80">{outro}</p>}
      </div>
    </div>
  );
};

export default VisitorHighlight;
