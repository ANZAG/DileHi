import { supabase } from "@/integrations/supabase/client";

/**
 * Die Meldung, die eine Edge Function tatsächlich zurückgegeben hat.
 *
 * Antwortet eine Funktion mit einem Fehlerstatus, steckt in `error.message`
 * von supabase-js nur „Edge Function returned a non-2xx status code". Die
 * eigentliche Auskunft („Keine Web-Adresse hinterlegt …") steht im Rumpf der
 * Antwort, und den muss man selbst lesen. Ohne das sieht jemand, der gerade
 * eine Installation einrichtet, eine Meldung, mit der er nichts anfangen kann –
 * auf Englisch.
 *
 * Die Funktionen schreiben ihre Meldung mal nach `error`, mal nach `fehler`.
 * Beides wird gelesen. Steht nichts Brauchbares darin, gibt es einen deutschen
 * Satz statt der englischen Meldung der Bibliothek.
 */
export async function readFunctionError(error: unknown): Promise<string> {
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response)) {
    // Keine Antwort heisst: Die Anfrage ist gar nicht angekommen – kein Netz,
    // Funktion nicht bereitgestellt, Server weg.
    return "Der Server ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.";
  }
  try {
    const body = await response.clone().json();
    const message = body?.error ?? body?.fehler;
    if (typeof message === "string" && message) return message;
  } catch {
    // Kein JSON im Rumpf – dann bleibt nur der Status.
  }
  return `Der Server hat einen Fehler gemeldet (${response.status}).`;
}

/**
 * Eine Edge Function aufrufen und bei einem Fehler mit ihrer Meldung abbrechen.
 *
 * `supabase.functions.invoke` wirft nicht, es gibt `{ data, error }` zurück.
 * Wer `error` nicht ansieht, merkt nichts – so hat die Mitgliederverwaltung
 * beim Austreten die Rolle gelöscht, auch wenn das Austrittsdatum nicht
 * gespeichert war. Hier kann man es nicht vergessen.
 *
 * Meldet eine Funktion mit Status 200 `{ error: "…" }`, gilt das ebenfalls
 * als Fehler.
 */
export async function invokeFunction<T = unknown>(
  name: string,
  options?: Parameters<typeof supabase.functions.invoke>[1]
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, options);
  if (error) throw new Error(await readFunctionError(error));
  const reported = (data as { error?: unknown } | null)?.error;
  if (typeof reported === "string" && reported) throw new Error(reported);
  return data as T;
}
