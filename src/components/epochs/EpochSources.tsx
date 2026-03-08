import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EpochSourcesProps {
  epoch: string;
}

const EpochSources = ({ epoch }: EpochSourcesProps) => {
  const { data: sources = [] } = useQuery({
    queryKey: ["epoch_sources", epoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epoch_sources" as any)
        .select("*")
        .eq("epoch", epoch)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data as any[];
    },
  });

  return (
    <div className="mb-12">
      <h2 className="font-serif text-2xl font-semibold mb-6">Unsere Quellen</h2>
      <div className="text-muted-foreground leading-relaxed space-y-4">
        <p>
          Unsere Darstellung stützt sich auf eine Vielzahl von Quellen – archäologische Funde, zeitgenössische Abbildungen und wissenschaftliche Literatur. Eine Auswahl:
        </p>
        {sources.length > 0 ? (
          <ul className="space-y-3 ml-1 text-sm">
            {sources.map((s: any) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span dangerouslySetInnerHTML={{ __html: s.text.replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic">Quellen werden in Kürze ergänzt.</p>
        )}
        <p className="text-sm italic">
          Diese Liste wird laufend ergänzt. Bei Fragen zu einzelnen Quellen stehen wir gerne zur Verfügung.
        </p>
      </div>
    </div>
  );
};

export default EpochSources;
