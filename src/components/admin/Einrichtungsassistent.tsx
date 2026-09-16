import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, CircleDashed, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functionError";
import { schritte, fortschritt, erwarteteMigrationen, type Ampel, type Befund, type Schritt } from "@/lib/einrichtung";
import { Kopierfeld } from "./anleitung/Bausteine";
import Einrichtungsprozess from "./Einrichtungsprozess";
import { zeigen } from "@/lib/einrichtungsprozess";

/**
 * Der Einrichtungsassistent.
 *
 * Wie bei WordPress: eine Seite, die sagt, was steht und was fehlt — und zwar
 * bevor jemand darüber stolpert. Bis hierher merkte ein neuer Verein einen
 * fehlenden Mailversand daran, dass die erste Einladung nicht ankam, und eine
 * fehlende Sicherung gar nicht.
 *
 * Jeder Schritt hat eine Ampel, einen Satz in normaler Sprache und, wenn er
 * nicht grün ist, den nächsten Handgriff. Von Secrets stehen hier nur die
 * Namen; den Wert sieht diese Seite nie.
 */

/**
 * Welche Migrationen dieser Stand des Programms mitbringt.
 *
 * Aus dem Build, nicht aus der Datenbank: Sonst verglichen wir die Datenbank
 * mit sich selbst und merkten nie, dass jemand das Ausrollen vergessen hat.
 * Die Liste setzt vite.config.ts ein; die SQL-Dateien selbst bleiben draussen.
 */
const ERWARTETE_MIGRATIONEN = typeof __MIGRATIONEN__ === "undefined" ? [] : __MIGRATIONEN__;

const SYMBOL: Record<Ampel, { icon: typeof CheckCircle2; farbe: string }> = {
  gut: { icon: CheckCircle2, farbe: "text-emerald-600 dark:text-emerald-400" },
  teilweise: { icon: CircleDashed, farbe: "text-amber-600 dark:text-amber-400" },
  fehlt: { icon: AlertCircle, farbe: "text-destructive" },
};

export default function Einrichtungsassistent({ oeffne }: { oeffne?: (tab: string) => void }) {
  const { toast } = useToast();
  const [probeLaeuft, setProbeLaeuft] = useState(false);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["einrichtung-status"],
    queryFn: async () => await invokeFunction<Befund>("einrichtung-status", { body: {} }),
    // Der Stand ändert sich, während jemand danebenher einrichtet.
    staleTime: 0,
  });

  const erwartet = erwarteteMigrationen(ERWARTETE_MIGRATIONEN);
  const liste = data ? schritte(data, erwartet) : [];
  const stand = fortschritt(liste);

  /**
   * Zwei Ansichten, ein Bauteil.
   *
   * Beim ersten Mal führt der Durchlauf Schritt für Schritt; wer ihn beendet
   * oder auf „Später" geht, sieht die Liste mit den Ampeln. Beide lesen
   * denselben Stand, es kann also nicht das eine etwas anderes behaupten als
   * das andere.
   */
  const [durchlaufOffen, setDurchlaufOffen] = useState(true);
  const durchlauf = data?.datenbank?.durchlauf;
  if (durchlaufOffen && zeigen(durchlauf) && oeffne) {
    return (
      <Einrichtungsprozess oeffne={oeffne} schliessen={() => setDurchlaufOffen(false)} />
    );
  }

  const probeversand = async () => {
    setProbeLaeuft(true);
    try {
      const antwort = await invokeFunction<{ ok?: boolean; weg?: string; an?: string; fehler?: string }>(
        "mail-test",
        { body: {} }
      );
      toast({
        title: antwort?.ok ? "Probeversand unterwegs" : "Probeversand gescheitert",
        description: antwort?.ok
          ? `Über ${antwort.weg} an ${antwort.an}. Kommt nichts an, im Spam nachsehen.`
          : antwort?.fehler,
        variant: antwort?.ok ? undefined : "destructive",
      });
    } catch (e) {
      toast({ title: "Probeversand gescheitert", description: (e as Error).message, variant: "destructive" });
    } finally {
      setProbeLaeuft(false);
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold">Steht alles?</h3>
          <p className="text-sm text-muted-foreground">
            {data
              ? stand.offen.length === 0
                ? "Die Installation ist vollständig. Was hier grün ist, muss niemand mehr suchen."
                : `${stand.fertig} von ${stand.gesamt} nötigen Schritten stehen. Was fehlt, steht unten.`
              : "Der Stand wird gelesen …"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {zeigen(durchlauf) && oeffne ? (
            <Button variant="outline" size="sm" onClick={() => setDurchlaufOffen(true)}>
              Schritt für Schritt
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} /> Prüfen
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Der Stand liess sich nicht lesen: {(error as Error).message}
        </p>
      ) : null}

      <ol className="space-y-2">
        {liste.map((s) => (
          <Zeile key={s.id} schritt={s} oeffne={oeffne} probeversand={probeversand} probeLaeuft={probeLaeuft} />
        ))}
      </ol>
    </div>
  );
}

function Zeile({
  schritt,
  oeffne,
  probeversand,
  probeLaeuft,
}: {
  schritt: Schritt;
  oeffne?: (tab: string) => void;
  probeversand: () => void;
  probeLaeuft: boolean;
}) {
  const { icon: Icon, farbe } = SYMBOL[schritt.ampel];

  return (
    <li className="rounded-lg border bg-background p-3">
      <div className="flex gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${farbe}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{schritt.titel}</span>
            {!schritt.pflicht ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">kann warten</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{schritt.text}</p>

          {schritt.todo ? <p className="text-sm">{schritt.todo}</p> : null}

          {schritt.fehlendeSecrets && schritt.fehlendeSecrets.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Diese Einträge fehlen in Supabase unter Edge Functions → Secrets. Die Namen zum
                Kopieren; die Werte kennt nur ihr:
              </p>
              <div className="flex flex-wrap gap-2">
                {schritt.fehlendeSecrets.map((name) => (
                  <div key={name} className="w-56">
                    <Kopierfeld text={name} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {schritt.ziel && oeffne ? (
              <Button variant="outline" size="sm" onClick={() => oeffne(schritt.ziel!)}>
                Dorthin
              </Button>
            ) : null}
            {schritt.id === "mail" ? (
              <Button variant="outline" size="sm" onClick={probeversand} disabled={probeLaeuft}>
                <Send size={14} /> Probeversand
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
