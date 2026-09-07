import { Check, AlertTriangle, HandHelping } from "lucide-react";
import { formatTaskWhen } from "@/components/event-forms/FormFieldRenderer";
import type { HelperTask } from "@/components/event-forms/types";

export interface HelperTaskResult extends HelperTask {
  count: number;
  names: string[];
}

/**
 * Helferaufgaben mit Bedarfsabgleich.
 *
 * Eine reine Zahl ("Aufbau: 4") beantwortet die Frage nicht, die sich die Orga
 * stellt. Manche Zelte brauchen sechs Leute gleichzeitig, die meisten drei –
 * erst der Abgleich sagt, ob es reicht.
 */
export default function EvalHelperTasks({ tasks }: { tasks: HelperTaskResult[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <HandHelping size={16} /> Helfer
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => {
          const when = formatTaskWhen(task.when);
          const needed = task.min ?? null;
          const short = needed !== null ? needed - task.count : 0;
          const covered = needed === null || short <= 0;

          return (
            <div key={task.key} className="flex items-start justify-between gap-3 py-1.5 border-b last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {task.label}
                  {when && <span className="font-normal text-muted-foreground"> · {when}</span>}
                </p>
                {task.names.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate" title={task.names.join(", ")}>
                    {task.names.join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm tabular-nums">
                  <span className="font-semibold">{task.count}</span>
                  {needed !== null && (
                    <span className="text-muted-foreground"> von {needed}</span>
                  )}
                </span>
                {needed !== null &&
                  (covered ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
                      title="Genug Helfer"
                    >
                      <Check size={14} /> reicht
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                      title={`Es fehlen noch ${short} Personen`}
                    >
                      <AlertTriangle size={14} /> {short} fehlen
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
