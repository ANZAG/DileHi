import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  aendereEinstellungen, einstellungSchluessel, ladeModulKennungen, schalteModule,
} from "@/daten/einstellungen";
import { useToast } from "@/hooks/use-toast";
import { FORMEN, modulVorauswahl, type OrgForm } from "@/lib/organisationsform";
import { FORM_REIHENFOLGE } from "@/lib/einrichtungsprozess";

/**
 * Verein, eingetragener Verein oder Interessengemeinschaft.
 *
 * Die erste Frage überhaupt: An ihr hängt, was es in dieser Installation gibt
 * (Aufnahmeantrag? Beiträge? Vorstand?) und mit welchen Wörtern die Oberfläche
 * spricht.
 *
 * Diese Maske stand bis zum Probelauf nur im geführten Durchlauf — und der
 * ging bei Eric nie auf. Damit gab es in der ganzen Verwaltung keine Stelle,
 * an der man die Form einstellen oder auch nur nachsehen konnte. Deshalb steht
 * sie jetzt dort, wo man sie sucht (Erscheinungsbild, ganz oben), und der
 * Durchlauf zeigt dieselbe Maske. Eine zweite Fassung derselben Frage läuft
 * auseinander, sobald jemand eine von beiden ändert.
 *
 * Die Module werden nicht heimlich umgestellt: Was passieren würde, steht
 * daneben, bevor jemand auf „Übernehmen" drückt — und wer nur die Wörter
 * ändern will, nimmt das Häkchen weg.
 */


export default function OrganisationsformWahl({
  wert,
  nachSpeichern,
  knopf = "Übernehmen",
}: {
  /** Was in den Einstellungen steht. */
  wert?: string | null;
  /** Läuft nach dem Speichern – im Durchlauf der Schritt weiter. */
  nachSpeichern?: () => void;
  knopf?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [wahl, setWahl] = useState<OrgForm>((wert as OrgForm) ?? "club");
  const [moduleAnpassen, setModuleAnpassen] = useState(true);

  const vorhandene = useQuery({
    queryKey: einstellungSchluessel.modulKennungen(),
    queryFn: ladeModulKennungen,
  });

  const wirkung = modulVorauswahl(wahl, vorhandene.data ?? []);
  const gespeichert = (wert as OrgForm) ?? null;

  const uebernehmen = useMutation({
    mutationFn: async () => {
      // Nur diese eine Spalte. Die Maske drumherum hat ihren eigenen Entwurf;
      // ihn hier mitzuschreiben hiesse, halbfertige Eingaben zu speichern.
      await aendereEinstellungen({ org_form: wahl });

      // Einzeln, damit ein Fehler bei einem nicht die anderen mitnimmt.
      return moduleAnpassen ? schalteModule(wirkung.an, wirkung.aus) : [];
    },
    onSuccess: (gescheitert) => {
      // Vereinsangaben, Erscheinungsbild, Module und der Stand der Einrichtung.
      queryClient.invalidateQueries({ queryKey: einstellungSchluessel.alle });
      if (gescheitert.length > 0) {
        toast({
          title: "Nicht alle Bereiche umgeschaltet",
          description: `Die Form ist gespeichert. Diese Bereiche bitte unter Module von Hand schalten: ${gescheitert.join(", ")}`,
          variant: "destructive",
        });
      }
      toast({ title: "Übernommen", description: FORMEN[wahl].label });
      nachSpeichern?.();
    },
    onError: (err: Error) =>
      toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {FORM_REIHENFOLGE.map((key) => {
          const f = FORMEN[key];
          const gewaehlt = wahl === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setWahl(key)}
              aria-pressed={gewaehlt}
              className={`rounded-lg border p-3 text-left transition ${
                gewaehlt ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
              }`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{f.label}</span>
                {gespeichert === key ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    eingestellt
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{f.text}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Was das ändert</p>
        <p className="mt-1 text-muted-foreground">
          Die Leitung heisst bei euch <strong>{FORMEN[wahl].leitung}</strong>, wer dabei
          ist, sind <strong>{FORMEN[wahl].mitglieder}</strong>.
          {wirkung.aus.length > 0 ? (
            <>
              {" "}
              Diese Bereiche bleiben aus, weil es sie bei euch nicht gibt:{" "}
              {wirkung.aus.join(", ")}. Anschalten könnt ihr sie jederzeit.
            </>
          ) : (
            " Alle Bereiche stehen euch offen."
          )}
        </p>
        <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={moduleAnpassen}
            onChange={(e) => setModuleAnpassen(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
          />
          <span className="text-sm">
            Module an die Form anpassen
            <span className="block text-xs text-muted-foreground">
              Ohne Häkchen ändern sich nur die Wörter. Sinnvoll, wenn ihr eure Bereiche
              schon selbst eingerichtet habt.
            </span>
          </span>
        </label>
      </div>

      <Button onClick={() => uebernehmen.mutate()} disabled={uebernehmen.isPending}>
        <Check size={16} /> {knopf}
      </Button>
    </div>
  );
}
