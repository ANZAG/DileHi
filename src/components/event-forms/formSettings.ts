import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

/**
 * Einziger Schreibweg für event_forms.settings.
 *
 * Vorher schrieben Formular-Baukasten und Auswertungsseite unabhängig
 * voneinander den kompletten JSONB-Blob zurück, zusammengeführt aus dem
 * zwischengespeicherten Stand im Browser. Wer die eine Seite offen hatte,
 * während auf der anderen etwas geändert wurde, überschrieb die fremde
 * Änderung stillschweigend – der Query-Cache hält zwei Minuten.
 *
 * Jetzt wird nur noch die tatsächliche Änderung gesendet und in der Datenbank
 * zusammengeführt.
 */

/** Fehlercode von PostgreSQL, wenn die Funktion (noch) nicht existiert. */
const UNDEFINED_FUNCTION = "42883";

export async function saveFormSettings(
  formId: string,
  patch: Record<string, unknown>
): Promise<void> {
  // Der Aufruf ist noch ungetypt, weil types.ts erst nach dem Einspielen der
  // Migration neu erzeugt wird. Nach der Neugenerierung kann die Zusicherung weg.
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { code?: string; message: string } | null }>)(
    "update_form_settings",
    { _form_id: formId, _patch: patch }
  );

  if (!error) return;

  if (error.code !== UNDEFINED_FUNCTION) throw new Error(error.message);

  // ── Rückfallweg ──────────────────────────────────────────────────────────
  // Solange die Migration 20260907180000 nicht eingespielt ist, wird hier
  // zusammengeführt – aber gegen den frisch gelesenen Stand aus der Datenbank
  // statt gegen den Browser-Cache. Das schließt das Zeitfenster nicht ganz,
  // verkleinert es aber von zwei Minuten auf wenige Millisekunden.
  // Dieser Block kann entfallen, sobald die Migration produktiv ist.
  const { data: current, error: readError } = await supabase
    .from("event_forms")
    .select("settings")
    .eq("id", formId)
    .single();
  if (readError) throw new Error(readError.message);

  const merged = { ...((current?.settings as Record<string, Json>) ?? {}), ...patch } as Json;
  const { error: writeError } = await supabase
    .from("event_forms")
    .update({ settings: merged })
    .eq("id", formId);
  if (writeError) throw new Error(writeError.message);
}

/**
 * Mutation für beide Seiten. Meldet Fehler sichtbar – bisher schluckte die
 * Auswertungsseite sie stillschweigend, sodass eine nicht gespeicherte
 * Einstellung wie eine gespeicherte aussah.
 */
export function useFormSettings(formId: string | undefined, eventId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!formId) return;
      await saveFormSettings(formId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form", eventId] });
    },
    onError: (err: Error) => {
      toast({
        title: "Einstellung nicht gespeichert",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
