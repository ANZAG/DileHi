import { useQuery } from "@tanstack/react-query";
import { aufnahmeSchluessel, ladeAntragsfelder } from "@/daten/aufnahme";
import { ausJson } from "@/lib/json";
import type { FormField } from "@/components/event-forms/types";

/**
 * Die Felder des Aufnahmeantrags.
 *
 * Kernfelder tragen den Namen ihrer Spalte in `membership_applications` –
 * aus ihnen entstehen Konto und Profil. Zusatzfelder haben keinen; ihre
 * Antworten landen gesammelt in `extra`.
 *
 * Die Form ist absichtlich dieselbe wie bei den Veranstaltungsformularen
 * (`FormField`): Damit rendern und bearbeiten dieselben Bausteine beides.
 */
export interface Antragsfeld extends FormField {
  column_name: string | null;
  is_active: boolean;
}

/** Was der Baukasten im Aufnahmeantrag anbieten darf. */
export const ANTRAG_FELDTYPEN = [
  "section", "text", "textarea", "number", "date", "select", "multi_select", "checkbox",
];


export function useAntragsfelder() {
  return useQuery({
    queryKey: aufnahmeSchluessel.felder(),
    queryFn: async (): Promise<Antragsfeld[]> =>
      (await ladeAntragsfelder()).map((f) => ({
        ...f,
        // Postgres gibt jsonb zurueck; der Renderer erwartet ein Array.
        options: Array.isArray(f.options) ? ausJson<string[]>(f.options) : [],
        settings: ausJson<FormField["settings"] | null>(f.settings) ?? {},
      })),
    staleTime: 5 * 60 * 1000,
  });
}

/** Kernfeld oder Zusatzfrage? */
export const istKernfeld = (feld: Pick<Antragsfeld, "column_name">) => !!feld.column_name;
