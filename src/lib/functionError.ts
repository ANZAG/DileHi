/**
 * Die Meldung, die eine Edge Function tatsächlich zurückgegeben hat.
 *
 * Antwortet eine Funktion mit einem Fehlerstatus, steckt in `error.message`
 * von supabase-js nur „Edge Function returned a non-2xx status code". Die
 * eigentliche Auskunft („Keine Web-Adresse hinterlegt …") steht im Rumpf der
 * Antwort, und den muss man selbst lesen. Ohne das sieht jemand, der gerade
 * eine Installation einrichtet, eine Meldung, mit der er nichts anfangen kann.
 *
 * Die Funktionen schreiben ihre Meldung mal nach `error`, mal nach `fehler`.
 * Beides wird gelesen.
 */
export async function readFunctionError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "";
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response)) return fallback;
  try {
    const body = await response.clone().json();
    const message = body?.error ?? body?.fehler;
    return typeof message === "string" && message ? message : fallback;
  } catch {
    return fallback;
  }
}
