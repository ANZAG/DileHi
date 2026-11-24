import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { alsJson, ausJson } from "@/lib/json";
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
  const { error } = await supabase.rpc("update_form_settings", { _form_id: formId, _patch: alsJson(patch) });

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

  // Beim Speichern springt die Seite sonst an den Anfang – etwa beim Ankreuzen
  // eines Zelts aus dem Pool. Auslöser ist das Neuladen des Formulars, das die
  // Auswertung samt Lageplan neu aufbaut. Die Position wird deshalb vor dem
  // Speichern gemerkt und danach wiederhergestellt.
  const scrollY = useRef(0);

  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!formId) return;
      await saveFormSettings(formId, patch);
    },
    onMutate: () => {
      scrollY.current = window.scrollY;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form", eventId] });
      // Nach dem Neuaufbau, nicht davor – sonst wird die alte Position gesetzt
      // und der Sprung passiert danach trotzdem.
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - scrollY.current) > 8) {
          window.scrollTo({ top: scrollY.current, behavior: "instant" });
        }
      });
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

/**
 * Was in event_forms.settings liegt. Die Spalte ist JSON; diese Liste ist die
 * Summe dessen, was Baukasten, Auswertung und Kalender dort lesen. Alles ist
 * freiwillig – ein älteres Formular hat davon nur einen Teil.
 */
export interface FormSettings {
  opens_at?: string | null;
  closes_at?: string | null;
  group_link?: string;
  /** Alter Schlüssel von group_link; wird nur noch gelesen. */
  whatsapp_link?: string;
  spacing_m?: number;
  club_tents?: string[];
  pool_tent_ids?: string[];
  kitchen_lead?: string;
  event_lead_id?: string;
  program_items?: { point: string; person: string }[];
  tent_positions?: Record<string, { x: number; y: number; rotated?: boolean }>;
  map_image_path?: string | null;
  map_scale?: number | null;
}

/** Die Einstellungen eines Formulars lesen; ohne Formular oder Inhalt leer. */
export const readFormSettings = (form: { settings: Json } | null | undefined): FormSettings =>
  ausJson<FormSettings | null>(form?.settings ?? null) ?? {};
