import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, CheckCircle2, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functionError";
import type { Findings } from "@/lib/einrichtung";
import {
  SCHRITTE,
  isDone,
  nextStep,
  progress,
} from "@/lib/einrichtungsprozess";
import OrganisationsformWahl from "./OrganisationsformWahl";

/**
 * Der geführte Durchlauf durch die Einrichtung.
 *
 * Nach dem ersten Zugang steht jemand vor einem leeren Mitgliederbereich. Die
 * Kachel „Einrichtung" sagt ihm, was fehlt — dieser Durchlauf führt ihn
 * hindurch: eine Frage nach der anderen, jede mit einem Satz, warum sie kommt.
 *
 * Er baut die Masken nicht nach, sondern zeigt die echten aus der Verwaltung —
 * auch die Formwahl, die es seit dem Probelauf unter Erscheinungsbild gibt.
 * Zwei Gründe: Was hier eingestellt wird, muss später an derselben Stelle
 * wiederzufinden sein. Und eine zweite Maske für dieselbe Sache läuft
 * auseinander, sobald jemand eine von beiden ändert.
 *
 * Der Stand steht in der Datenbank (`app_settings.setup_step`), nicht im
 * Browser: Es ist die Einrichtung der Organisation, nicht die eines Geräts.
 */

const db = supabase as unknown as { from: (t: string) => any };

export default function Einrichtungsprozess({
  oeffne,
  schliessen,
}: {
  /** Führt in einen Verwaltungsbereich – der Durchlauf zeigt ihn eingebettet. */
  oeffne: (bereich: string) => void;
  schliessen: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [laeuft, setLaeuft] = useState(false);

  const { data: befund, refetch } = useQuery({
    queryKey: ["einrichtung-status"],
    queryFn: async () => await invokeFunction<Findings>("einrichtung-status", { body: {} }),
    staleTime: 0,
  });

  const stand = befund?.datenbank?.durchlauf ?? { schritt: 0, fertig_am: null };
  const index = befund ? nextStep(befund, stand) : 0;
  const schritt = SCHRITTE[index];
  const weite = befund ? progress(befund, stand) : { fertig: 0, gesamt: SCHRITTE.length };

  /** Den Stand fortschreiben. Ein Schritt gilt als abgehakt, sobald man weitergeht. */
  const merken = async (bis: number, fertig = false) => {
    setLaeuft(true);
    try {
      const patch: Record<string, unknown> = { setup_step: bis };
      if (fertig) patch.setup_done_at = new Date().toISOString();
      const { error } = await db.from("app_settings").update(patch).eq("id", true);
      if (error) throw new Error(error.message);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["branding"] });
    } catch (e) {
      toast({ title: "Ging nicht", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLaeuft(false);
    }
  };

  if (!befund) {
    return <p className="text-sm text-muted-foreground">Der Stand wird gelesen …</p>;
  }

  if (!schritt) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} /> Fertig
        </h3>
        <p className="text-sm text-muted-foreground">
          Die Einrichtung steht. Was später noch fehlt oder sich ändert, sagt euch
          die Kachel <strong>Einrichtung</strong> — sie prüft jederzeit nach.
        </p>
        <Button onClick={() => merken(SCHRITTE.length, true)} disabled={laeuft}>
          <Check size={16} /> Durchlauf beenden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Einrichtung · Schritt {index + 1} von {SCHRITTE.length}
          </p>
          <Button variant="ghost" size="sm" onClick={schliessen}>
            <X size={15} /> Später
          </Button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round((weite.fertig / weite.gesamt) * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-serif text-xl font-semibold">{schritt.titel}</h3>
        <p className="text-sm text-muted-foreground">{schritt.warum}</p>
      </div>

      {schritt.id === "form" ? (
        // Dieselbe Maske wie unter Erscheinungsbild – der Durchlauf baut sie
        // nicht nach. Was hier eingestellt wird, muss später an derselben
        // Stelle wiederzufinden sein.
        <OrganisationsformWahl
          wert={befund.datenbank?.verein?.org_form}
          nachSpeichern={() => merken(index + 1)}
          knopf="Übernehmen und weiter"
        />
      ) : (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm">
            Das stellt ihr unter <strong>{bereichsname(schritt.bereich)}</strong> ein. Der
            Knopf führt euch hin; danach kommt ihr über die Kachel „Einrichtung"
            hierher zurück.
          </p>
          <div className="flex flex-wrap gap-2">
            {schritt.bereich ? (
              <Button onClick={() => oeffne(schritt.bereich!)}>
                Dorthin <ArrowRight size={16} />
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => merken(index + 1)} disabled={laeuft}>
              {isDone(schritt.id, befund) ? (
                <>
                  <Check size={16} /> Erledigt, weiter
                </>
              ) : (
                <>
                  <SkipForward size={16} /> {schritt.pflicht ? "Später" : "Überspringen"}
                </>
              )}
            </Button>
          </div>
          {schritt.pflicht && !isDone(schritt.id, befund) ? (
            <p className="text-xs text-muted-foreground">
              Ohne diesen Schritt läuft die Installation nicht rund — aber er kann
              warten, bis ihr die Angaben beisammen habt.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function bereichsname(bereich?: string): string {
  switch (bereich) {
    case "erscheinungsbild":
      return "Verwaltung → Erscheinungsbild";
    case "module":
      return "Verwaltung → Module";
    case "rollen":
      return "Verwaltung → Rollen";
    case "members":
      return "Verwaltung → Mitglieder";
    default:
      return "der Verwaltung";
  }
}
