import type { FormAnswer, FormField, FormResponse } from "@/components/event-forms/types";
import type { AllergyNote, CateringDay } from "./EvalCatering";

/** Schlüssel für Antworten ohne Angabe der Ernährungsweise. */
export const NO_DIET_ANSWER = "—";

type ResponseWithAnswers = Pick<FormResponse, "respondent_name"> & { answers?: FormAnswer[] };

const answerFor = (resp: ResponseWithAnswers, fieldId: string): unknown =>
  resp.answers?.find((a) => a.field_id === fieldId)?.value;

/**
 * Verpflegung je Tag: Anwesenheitstage kreuz Ernährungsweise.
 *
 * Beides gab es bisher einzeln – die Belegung je Tag und die Ernährungsweise –,
 * die Kombination nie. Wer für Samstag kocht, musste sie im Kopf bilden.
 *
 * Bewusst eine reine Funktion: Das ist die Zahl, nach der eingekauft wird, und
 * ein Fehler darin fällt niemandem auf, bevor das Essen ausgeht.
 */
export function aggregateCatering(
  responses: ResponseWithAnswers[],
  attendanceField?: FormField,
  dietField?: FormField,
  allergyField?: FormField
): { days: CateringDay[]; allergies: AllergyNote[] } {
  const byDay: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  const allergies: AllergyNote[] = [];

  for (const resp of responses) {
    const diet = dietField
      ? String(answerFor(resp, dietField.id) ?? "").trim()
      : "";

    if (attendanceField) {
      const value = answerFor(resp, attendanceField.id) as { days?: unknown } | undefined;
      const days = Array.isArray(value?.days) ? (value!.days as unknown[]) : [];
      // Ein Tag darf pro Anmeldung nur einmal zählen, auch wenn er doppelt
      // im Array steht – sonst kocht man für Gespenster.
      for (const day of new Set(days.map(String))) {
        totals[day] = (totals[day] || 0) + 1;
        const bucket = (byDay[day] ??= {});
        const key = diet || NO_DIET_ANSWER;
        bucket[key] = (bucket[key] || 0) + 1;
      }
    }

    if (allergyField) {
      const text = String(answerFor(resp, allergyField.id) ?? "").trim();
      if (text) allergies.push({ name: resp.respondent_name, text });
    }
  }

  const days: CateringDay[] = Object.keys(byDay)
    .sort()
    .map((day) => ({ day, total: totals[day] || 0, byDiet: byDay[day] }));

  return { days, allergies };
}
