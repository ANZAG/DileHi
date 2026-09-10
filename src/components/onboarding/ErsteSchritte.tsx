import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Compass, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboarding, fuehrungStarten } from "./useOnboarding";
import { zeichen } from "./icons";

/**
 * „Erste Schritte" auf der Startseite des Mitgliederbereichs.
 *
 * Keine Diashow, sondern eine Liste von Dingen, die jemand tut. Was erledigt
 * ist, weiss die Anwendung selbst: Das Profil ist ausgefüllt, ein Zelt ist
 * eingetragen, es gibt eine erste Zusage. Deshalb gibt es hier kein Kästchen
 * zum Anklicken – ein Häkchen, das man setzen kann, ohne die Sache getan zu
 * haben, wäre nur eine höflichere Diashow.
 *
 * Der Kasten verschwindet, wenn alles erledigt ist, und kommt wieder, wenn
 * eine neue Aufgabe dazukommt. Das ist der eigentliche Vorteil gegenüber der
 * Tour: Er ist beim zweiten und dritten Anmelden noch da.
 */
export default function ErsteSchritte() {
  const { aufgaben, fortschritt, bereit, ausblenden } = useOnboarding();
  const [alleZeigen, setAlleZeigen] = useState(false);

  if (!bereit || aufgaben.length === 0) return null;
  if (fortschritt.fertig === fortschritt.gesamt) return null;

  const offen = aufgaben.filter((a) => !a.fertig);
  const fertig = aufgaben.filter((a) => a.fertig);
  const sichtbar = alleZeigen ? [...offen, ...fertig] : offen.slice(0, 4);

  return (
    <div className="mt-6 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-serif text-base sm:text-lg font-semibold">Erste Schritte</h2>
        <p className="text-xs text-muted-foreground">
          {fortschritt.fertig} von {fortschritt.gesamt} erledigt
        </p>
      </div>

      <Progress
        value={(fortschritt.fertig / Math.max(1, fortschritt.gesamt)) * 100}
        className="h-1.5 mb-4"
      />

      <ul className="space-y-1">
        {sichtbar.map((a) => {
          const Icon = zeichen(a.icon);
          return (
            <li
              key={a.key}
              className="flex items-center gap-2 sm:gap-3 py-1.5 border-b last:border-0"
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  a.fertig
                    ? "bg-primary/10 text-primary"
                    : "border text-muted-foreground"
                }`}
              >
                {a.fertig ? <Check size={13} /> : <Icon size={13} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-sm ${a.fertig ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {a.titel}
                </p>
              </div>

              {!a.fertig && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-8 text-xs"
                    onClick={() => fuehrungStarten(a.key)}
                  >
                    Zeigen
                  </Button>
                  <button
                    onClick={() => ausblenden(a.key)}
                    aria-label={`${a.titel} betrifft mich nicht`}
                    title="Betrifft mich nicht"
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <EyeOff size={13} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
        {(offen.length > 4 || fertig.length > 0) && (
          <button
            onClick={() => setAlleZeigen(!alleZeigen)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {alleZeigen ? (
              <><ChevronUp size={14} /> Weniger zeigen</>
            ) : (
              <><ChevronDown size={14} /> Alle {aufgaben.length} zeigen</>
            )}
          </button>
        )}

        <button
          onClick={() => fuehrungStarten()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Compass size={14} /> Durch den Mitgliederbereich führen
        </button>
      </div>
    </div>
  );
}
