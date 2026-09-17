import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LayoutGrid, List, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useModule, type ModuleState } from "@/hooks/useModule";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Kacheln oder Liste.
 *
 * Neunzehn Module untereinander sind eine Liste zum Durchgehen; in Kacheln
 * sieht man auf einen Blick, was an ist. Beides hat seinen Moment, deshalb
 * beides — wie in der Beitragsübersicht. Die Wahl bleibt im Browser, sie
 * gehört niemandem ausser dem, der gerade hinsieht.
 */
type Ansicht = "liste" | "kacheln";

const GEMERKT = "ding.module.ansicht";

function gemerkteAnsicht(): Ansicht {
  try {
    return localStorage.getItem(GEMERKT) === "kacheln" ? "kacheln" : "liste";
  } catch {
    // Ohne Zugriff auf den Speicher (privates Fenster) bleibt es bei der Liste.
    return "liste";
  }
}

function AnsichtWahl({ ansicht, setze }: { ansicht: Ansicht; setze: (a: Ansicht) => void }) {
  return (
    <div className="flex rounded-md border bg-background p-0.5">
      {([
        ["liste", List, "Liste"],
        ["kacheln", LayoutGrid, "Kacheln"],
      ] as const).map(([wert, Icon, titel]) => (
        <button
          key={wert}
          type="button"
          onClick={() => setze(wert)}
          aria-pressed={ansicht === wert}
          title={titel}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
            ansicht === wert ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={14} /> {titel}
        </button>
      ))}
    </div>
  );
}

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
  const [ansicht, setAnsichtRoh] = useState<Ansicht>(gemerkteAnsicht);
  const setAnsicht = (a: Ansicht) => {
    setAnsichtRoh(a);
    try {
      localStorage.setItem(GEMERKT, a);
    } catch {
      // Nicht schlimm: Dann fängt der nächste Besuch wieder mit der Liste an.
    }
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: module = [], isLoading } = useModule();

  const schalten = useMutation({
    mutationFn: async (m: ModuleState) => {
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

  const grund = (m: ModuleState) => {
    if (!m.enabled) return null;
    // Die Bereiche für gemeinnützige Vereine hängen an einer Einstellung,
    // nicht an einem Schalter hier – das gehört dazugesagt.
    if (!m.active && m.requires === "nonprofit") {
      return "Erscheint erst, wenn unter Allgemeine Einstellungen → Erscheinungsbild „Gemeinnützig“ angekreuzt ist.";
    }
    // Eingeschaltet, aber wirkungslos: Das gehoert dazugesagt, sonst sucht
    // jemand den Bereich, dessen Schalter auf „an" steht.
    if (!m.active) return `Wirkt nicht, solange „${label(m.requires)}" abgeschaltet ist.`;
    return null;
  };

  // „Gemeinnütziger Verein“ ist kein Bereich, sondern eine Eigenschaft des
  // Vereins und wird im Erscheinungsbild eingestellt.
  const grundfunktionen = module.filter((m) => m.kind !== "addon" && m.key !== "nonprofit");
  const zusaetze = module.filter((m) => m.kind === "addon");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold">Module</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Was diese Installation anbietet. Abgeschaltet verschwindet ein Bereich
            samt Menüpunkt, Kachel und Verwaltung. Die Daten bleiben und kommen
            beim Wiedereinschalten zurück.
          </p>
        </div>
        <AnsichtWahl ansicht={ansicht} setze={setAnsicht} />
      </div>

      <Liste
        titel="Grundfunktionen"
        hinweis="Eigene Bereiche des Mitgliederbereichs oder der öffentlichen Seite."
        module={grundfunktionen}
        ansicht={ansicht}
        schalten={schalten}
        grund={grund}
        haengtDran={haengtDran}
      />

      <Liste
        titel="Zusätze"
        hinweis="Erweiterungen eines anderen Moduls. Sie stammen aus unserer eigenen Praxis: Wer nicht auf Lagern übernachtet, braucht sie nicht."
        module={zusaetze}
        ansicht={ansicht}
        schalten={schalten}
        grund={grund}
        haengtDran={haengtDran}
      />

      <p className="text-xs text-muted-foreground mt-6 max-w-prose">
        Mitglieder, Rollen und Rechte, das Erscheinungsbild und die öffentlichen
        Seiten stehen nicht in dieser Liste: Eine Verwaltung ohne Mitglieder
        wäre keine.
      </p>
    </div>
  );
}

function Liste({ titel, hinweis, module, schalten, grund, haengtDran, ansicht }: {
  titel: string;
  hinweis: string;
  module: ModuleState[];
  ansicht: Ansicht;
  schalten: { mutate: (m: ModuleState) => void; isPending: boolean; variables?: ModuleState };
  grund: (m: ModuleState) => string | null;
  haengtDran: (key: string) => string[];
}) {
  if (module.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="font-serif text-base font-semibold">{titel}</h3>
      <p className="text-sm text-muted-foreground mb-3 max-w-prose">{hinweis}</p>

      <ul
        className={
          ansicht === "kacheln"
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "divide-y rounded-lg border bg-card overflow-hidden"
        }
      >
        {module.map((m) => {
          const mit = haengtDran(m.key);
          const warnung = grund(m);
          return (
            <li
              key={m.key}
              className={`${
                ansicht === "kacheln"
                  ? "flex flex-col gap-2 rounded-lg border bg-card p-3"
                  : "flex flex-wrap items-start gap-2 p-3"
              } ${m.active ? "" : "opacity-60"}`}
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
