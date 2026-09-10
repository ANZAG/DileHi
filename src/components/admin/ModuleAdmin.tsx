import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useModule, type Modulstand } from "@/hooks/useModule";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Was diese Installation anbietet.
 *
 * Der Kern des Produktgedankens: Ein Schachverein braucht keine
 * Zeltflächenberechnung, eine lose Interessengemeinschaft keine
 * Mitgliederversammlung mit Abstimmungen. Abgeschaltet verschwindet ein Modul
 * überall – Menü, Kacheln, Verwaltungsreiter, Profilbereiche, Routen.
 *
 * Abschalten löscht nichts. Wer versehentlich das Forum abschaltet, findet die
 * Beiträge nach dem Wiedereinschalten unverändert vor. Das ist keine
 * Bequemlichkeit, sondern die Voraussetzung dafür, dass sich jemand traut,
 * etwas auszuprobieren.
 */
export default function ModuleAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: module = [], isLoading } = useModule();

  const schalten = useMutation({
    mutationFn: async (m: Modulstand) => {
      const { error } = await db.from("app_modules")
        .update({ enabled: !m.enabled }).eq("key", m.key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Fast alles auf der Seite haengt daran – auch die Verwaltungskacheln
      // neben dieser Liste.
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Module …</p>;
  }
  if (module.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Keine Module gefunden. Ist die Migration eingespielt?
      </p>
    );
  }

  const label = (key: string | null) => module.find((m) => m.key === key)?.label ?? key;

  /** Was noch abgeschaltet wird, wenn dieses Modul ausgeht. */
  const haengtDran = (key: string) =>
    module.filter((m) => m.requires === key && m.enabled).map((m) => m.label);

  const grund = (m: Modulstand) => {
    if (!m.enabled) return null;
    // Eingeschaltet, aber wirkungslos: Das gehoert dazugesagt, sonst sucht
    // jemand den Bereich, dessen Schalter auf „an" steht.
    if (!m.aktiv) return `Wirkt nicht, solange „${label(m.requires)}" abgeschaltet ist.`;
    return null;
  };

  const grundfunktionen = module.filter((m) => m.art !== "zusatz");
  const zusaetze = module.filter((m) => m.art === "zusatz");

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-lg font-semibold">Module</h2>
        <p className="text-sm text-muted-foreground max-w-prose">
          Was diese Installation anbietet. Abgeschaltet verschwindet ein Bereich
          samt Menüpunkt, Kachel und Verwaltung. Die Daten bleiben und kommen
          beim Wiedereinschalten zurück.
        </p>
      </div>

      <Liste
        titel="Grundfunktionen"
        hinweis="Eigene Bereiche des Mitgliederbereichs oder der öffentlichen Seite."
        module={grundfunktionen}
        schalten={schalten}
        grund={grund}
        haengtDran={haengtDran}
      />

      <Liste
        titel="Zusätze"
        hinweis="Erweiterungen eines anderen Moduls. Sie stammen aus unserer eigenen Praxis: ein Verein, der nicht auf Lagern übernachtet, braucht sie nicht."
        module={zusaetze}
        schalten={schalten}
        grund={grund}
        haengtDran={haengtDran}
      />

      <p className="text-xs text-muted-foreground mt-6 max-w-prose">
        Mitglieder, Rollen und Rechte, das Erscheinungsbild und die öffentlichen
        Seiten stehen nicht in dieser Liste: Eine Vereinsverwaltung ohne
        Mitglieder wäre keine.
      </p>
    </div>
  );
}

function Liste({ titel, hinweis, module, schalten, grund, haengtDran }: {
  titel: string;
  hinweis: string;
  module: Modulstand[];
  schalten: { mutate: (m: Modulstand) => void; isPending: boolean; variables?: Modulstand };
  grund: (m: Modulstand) => string | null;
  haengtDran: (key: string) => string[];
}) {
  if (module.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="font-serif text-base font-semibold">{titel}</h3>
      <p className="text-sm text-muted-foreground mb-3 max-w-prose">{hinweis}</p>

      <ul className="divide-y rounded-lg border bg-card overflow-hidden">
        {module.map((m) => {
          const mit = haengtDran(m.key);
          const warnung = grund(m);
          return (
            <li
              key={m.key}
              className={`flex flex-wrap items-start gap-2 p-3 ${m.aktiv ? "" : "opacity-60"}`}
            >
              <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                <span className="font-medium text-sm">{m.label}</span>
                {m.description && (
                  <span className="block text-xs text-muted-foreground">{m.description}</span>
                )}
                {warnung && (
                  <span className="block text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                    {warnung}
                  </span>
                )}
                {m.enabled && mit.length > 0 && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Abschalten nimmt mit: {mit.join(", ")}
                  </span>
                )}
              </span>

              <Button
                variant={m.enabled ? "ghost" : "outline"}
                size="sm"
                disabled={schalten.isPending}
                onClick={() => {
                  if (m.enabled && mit.length > 0 &&
                      !confirm(`„${m.label}" abschalten? Damit verschwindet auch: ${mit.join(", ")}. Daten bleiben erhalten.`)) {
                    return;
                  }
                  schalten.mutate(m);
                }}
              >
                {schalten.isPending && schalten.variables?.key === m.key
                  ? <Loader2 size={15} className="mr-1 animate-spin" />
                  : m.enabled
                  ? <Check size={15} className="mr-1" />
                  : <X size={15} className="mr-1" />}
                {m.enabled ? "an" : "aus"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
