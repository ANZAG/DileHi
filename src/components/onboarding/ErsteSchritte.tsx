import { Check, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useOnboarding } from "./useOnboarding";
import { zeichen } from "./icons";

/**
 * „Erste Schritte" – die Liste im Profil.
 *
 * Keine Diashow, sondern Dinge, die jemand tut. Was erledigt ist, weiss die
 * Anwendung selbst: Der Name steht da, ein Zelt ist eingetragen, es gibt eine
 * Zusage. Deshalb gibt es hier kein Kästchen zum Anklicken – ein Häkchen, das
 * man setzen kann, ohne die Sache getan zu haben, wäre nur eine höflichere
 * Diashow.
 *
 * Sie steht im Profil und nicht auf der Startseite: Die meisten Punkte
 * erledigt man genau hier, und die Startseite soll den Überblick zeigen und
 * keine Hausaufgaben.
 *
 * Wenn alles erledigt ist, verschwindet der Kasten. Er kommt wieder, wenn eine
 * neue Aufgabe dazukommt.
 */
export default function ErsteSchritte() {
  const { aufgaben, progress, bereit, ausblenden } = useOnboarding();

  if (!bereit || aufgaben.length === 0) return null;
  if (progress.fertig === progress.gesamt) return null;

  return (
    <div data-tour="profil-checkliste" className="p-6 rounded-lg border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-serif text-lg font-semibold">Erste Schritte</h2>
        <p className="text-xs text-muted-foreground">
          {progress.fertig} von {progress.gesamt} erledigt
        </p>
      </div>

      <Progress
        value={(progress.fertig / Math.max(1, progress.gesamt)) * 100}
        className="h-1.5 mb-4"
      />

      <ul className="space-y-3">
        {aufgaben.map((a) => {
          const Icon = zeichen(a.icon);
          return (
            <li key={a.key} className="flex items-start gap-3">
              <span
                className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                  a.fertig ? "bg-primary/10 text-primary" : "border text-muted-foreground"
                }`}
              >
                {a.fertig ? <Check size={13} /> : <Icon size={13} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-sm ${a.fertig ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {a.title}
                </p>
                {!a.fertig && (
                  <p className="text-xs text-muted-foreground mt-0.5">{a.text}</p>
                )}
              </div>

              {!a.fertig && (
                <button
                  onClick={() => ausblenden(a.key)}
                  aria-label={`${a.title} betrifft mich nicht`}
                  title="Betrifft mich nicht"
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <EyeOff size={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
