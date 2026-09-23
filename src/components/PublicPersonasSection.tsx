import { useQuery } from "@tanstack/react-query";
import { useEinblenden } from "@/lib/einblenden";
import { supabase } from "@/integrations/supabase/client";

interface PublicPersona {
  period: string;
  portrayal: string;
  expertise: string;
  images: string[];
  /** Nur gesetzt, wenn die Person dem selbst zugestimmt hat. */
  name: string | null;
}

/**
 * Welche Darstellungen der Verein anbietet – ohne Personenbezug.
 *
 * Für ein Museum, das den Verein bucht, ist interessant, WAS gezeigt wird,
 * nicht WER es zeigt. Deshalb kommen hier weder Namen noch Nutzerkennungen an:
 * get_public_personas gibt sie gar nicht erst heraus.
 *
 * Freigegeben wird je Darstellung durch den Herold.
 *
 * Überschrift, Einleitung und Aussenabstand sind einstellbar, weil derselbe
 * Abschnitt auch als Baustein im Seiteneditor steht. Es gibt bewusst nur diese
 * eine Fassung: Der Baustein war zuerst eine zweite, eigene Umsetzung – anderes
 * Raster, andere Bildformate, keine Gruppierung nach Zeitstellung – und wäre
 * damit über kurz oder lang von dieser hier abgewichen.
 */
/**
 * Der Einleitungssatz, wenn keiner eingetragen ist.
 *
 * Steht hier und nicht zusaetzlich im Baukasten: Er stand an beiden Stellen
 * wortgleich, und zwei Fassungen desselben Satzes laufen auseinander.
 */
export const DARSTELLUNGEN_EINLEITUNG =
  "Welche Epochen und Handwerke wir zeigen können, nach Zeitstellung geordnet. " +
  "Sprechen Sie uns gern an, wenn Sie etwas Bestimmtes suchen.";

export default function PublicPersonasSection({
  ueberschrift = "Unsere Darstellungen",
  einleitung = DARSTELLUNGEN_EINLEITUNG,
  kategorie,
  rahmen,
  namenZeigen,
}: {
  ueberschrift?: string;
  einleitung?: string;
  /** Leer = alle Zeitstellungen. */
  kategorie?: string;
  /** Klassen für den umgebenden Abschnitt; der Baustein setzt hier Breite und
   *  Abstand aus seinen eigenen Feldern ein. */
  rahmen?: string;
  /** Namen zeigen, sofern die jeweilige Person zugestimmt hat. */
  namenZeigen?: boolean;
} = {}) {
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

  // Vor dem frühen Rückgabewert: Hooks stehen immer in derselben Reihenfolge.
  const [einblenden, einblendKlasse] = useEinblenden<HTMLDivElement>();
  const gefiltert = kategorie ? personas.filter((p) => p.period === kategorie) : personas;

  // Nichts freigegeben, nichts anzeigen – kein leerer Abschnitt.
  if (gefiltert.length === 0) return null;

  const byPeriod = gefiltert.reduce<Record<string, PublicPersona[]>>((acc, p) => {
    const key = p.period?.trim() || "Weitere Darstellungen";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const imageUrl = (path: string) =>
    supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

  return (
    <section className={rahmen ?? "container mx-auto py-16 md:py-24 max-w-4xl"}>
      <div ref={einblenden} className={einblendKlasse}>
        {ueberschrift && (
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">{ueberschrift}</h2>
        )}
        {einleitung && <p className="text-muted-foreground mb-10 max-w-2xl">{einleitung}</p>}

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
                      {/*
                        * Der Name steht nur da, wenn zwei Dinge zutreffen: Die
                        * Person hat in ihrem Profil zugestimmt, und der Verein
                        * hat es fuer diese Seite eingeschaltet. Ein Name im Netz
                        * ist die Entscheidung der Person, nicht des Vereins –
                        * deshalb reicht ein Schalter nicht.
                        */}
                      {namenZeigen && p.name && (
                        <p className="text-sm font-medium text-primary">{p.name}</p>
                      )}
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
      </div>
    </section>
  );
}
