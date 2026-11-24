import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ausJson } from "@/lib/json";
import { speichereFormularEinstellungen, veranstaltungSchluessel } from "@/daten/veranstaltungen";
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
 * zusammengeführt – in `speichereFormularEinstellungen` (src/daten).
 */

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
      await speichereFormularEinstellungen(formId, patch);
    },
    onMutate: () => {
      scrollY.current = window.scrollY;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: veranstaltungSchluessel.formular(eventId) });
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
