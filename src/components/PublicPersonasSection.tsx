import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PublicPersona {
  period: string;
  portrayal: string;
  expertise: string;
  images: string[];
}

/**
 * Welche Darstellungen der Verein anbietet – ohne Personenbezug.
 *
 * Für ein Museum, das den Verein bucht, ist interessant, WAS gezeigt wird,
 * nicht WER es zeigt. Deshalb kommen hier weder Namen noch Nutzerkennungen an:
 * get_public_personas gibt sie gar nicht erst heraus.
 *
 * Freigegeben wird je Darstellung durch den Herold.
 */
export default function PublicPersonasSection() {
  const { data: personas = [] } = useQuery({
    queryKey: ["public-personas"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string
      ) => Promise<{ data: PublicPersona[] | null; error: unknown }>)("get_public_personas");
      if (error) return [];
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Nichts freigegeben, nichts anzeigen – kein leerer Abschnitt.
  if (personas.length === 0) return null;

  const byPeriod = personas.reduce<Record<string, PublicPersona[]>>((acc, p) => {
    const key = p.period?.trim() || "Weitere Darstellungen";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const imageUrl = (path: string) =>
    supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

  return (
    <section className="container py-16 md:py-24 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">Unsere Darstellungen</h2>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Welche Epochen und Handwerke wir zeigen können – nach Zeitstellung geordnet.
          Sprechen Sie uns gern an, wenn Sie etwas Bestimmtes suchen.
        </p>

        <div className="space-y-10">
          {Object.entries(byPeriod).map(([period, entries]) => (
            <div key={period}>
              <h3 className="font-serif text-lg font-semibold text-primary mb-4">{period}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {entries.map((p, i) => (
                  <article key={`${period}-${i}`} className="rounded-lg border bg-card overflow-hidden">
                    {p.images?.[0] && (
                      <img
                        src={imageUrl(p.images[0])}
                        alt={`Darstellung: ${p.portrayal}`}
                        loading="lazy"
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="font-semibold">{p.portrayal}</h4>
                      {p.expertise && (
                        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-line">
                          {p.expertise}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
