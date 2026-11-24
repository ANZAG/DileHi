// Übersetzen mit DeepL – nur das Gespräch mit der Schnittstelle.
//
// Ohne Zugriff auf Datenbank oder Umgebung, damit es sich prüfen lässt
// (src/test/deepl.test.ts ersetzt `holen` durch eine Attrappe; echte Anfragen
// an DeepL stellt kein Test).

/** Zielsprachen, wie DeepL sie nennt. Englisch ausdrücklich britisch. */
export const DEEPL_SPRACHE: Record<string, string> = { en: "EN-GB", fr: "FR" };

export const SCHLUESSEL_FEHLT =
  "Für die maschinelle Übersetzung ist kein DeepL-Schlüssel hinterlegt. " +
  "Den Schlüssel bei Supabase als Geheimnis DEEPL_API_KEY eintragen (Edge Functions → Secrets) – " +
  "oder die Seite von Hand übersetzen.";

/**
 * Kostenlose Schlüssel enden auf „:fx" und gelten nur an der eigenen Adresse;
 * an der anderen antwortet DeepL mit 403.
 */
export function deeplAdresse(schluessel: string): string {
  return schluessel.trim().endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

export interface Uebersetzbar {
  schluessel: string;
  art: "text" | "html";
  text: string;
}

/** DeepL nimmt höchstens 50 Texte und 128 KiB je Anfrage; hier mit Abstand. */
const HOECHSTENS_TEXTE = 40;
const HOECHSTENS_ZEICHEN = 30_000;

/**
 * Die Texte auf Anfragen verteilen: nach Art getrennt – nur bei „html" darf
 * DeepL Tags als Auszeichnung lesen, sonst machte es aus „a < b" ein halbes
 * Tag –, und jede Anfrage unter den Grenzen der Schnittstelle.
 */
export function inAnfragen(texte: Uebersetzbar[]): Uebersetzbar[][] {
  const anfragen: Uebersetzbar[][] = [];
  for (const art of ["text", "html"] as const) {
    let lauf: Uebersetzbar[] = [];
    let zeichen = 0;
    for (const t of texte.filter((x) => x.art === art)) {
      if (lauf.length > 0 && (lauf.length >= HOECHSTENS_TEXTE || zeichen + t.text.length > HOECHSTENS_ZEICHEN)) {
        anfragen.push(lauf);
        lauf = [];
        zeichen = 0;
      }
      lauf.push(t);
      zeichen += t.text.length;
    }
    if (lauf.length > 0) anfragen.push(lauf);
  }
  return anfragen;
}

type Holen = (adresse: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** Was DeepL auf einen Fehlerstatus hin bedeutet – auf Deutsch, für die Verwaltung. */
function fehlermeldung(status: number): string {
  if (status === 403) return "DeepL lehnt den Schlüssel ab (403). Stimmt DEEPL_API_KEY, und passt er zum Tarif (kostenlos endet auf „:fx“)?";
  if (status === 456) return "Das Zeichenkontingent bei DeepL ist für diesen Monat aufgebraucht (456).";
  if (status === 429) return "DeepL ist gerade überlastet (429). Bitte in einer Minute noch einmal versuchen.";
  return `DeepL hat einen Fehler gemeldet (${status}).`;
}

/**
 * Übersetzt die Texte aus dem Deutschen und gibt sie nach Schlüssel zurück.
 *
 * Auszeichnung bleibt stehen (`tag_handling: html`); übersetzt wird nur, was
 * zwischen den Tags steht. Scheitert eine Anfrage, scheitert das Ganze: Eine
 * halb übersetzte Seite soll nicht als Übersetzung gespeichert werden.
 */
export async function uebersetzen(
  texte: Uebersetzbar[],
  sprache: string,
  schluessel: string,
  holen: Holen = fetch,
): Promise<Record<string, string>> {
  const ziel = DEEPL_SPRACHE[sprache];
  if (!ziel) throw new Error(`Unbekannte Zielsprache: ${sprache}`);
  if (!schluessel.trim()) throw new Error(SCHLUESSEL_FEHLT);

  const ergebnis: Record<string, string> = {};
  for (const anfrage of inAnfragen(texte)) {
    const html = anfrage[0].art === "html";
    const antwort = await holen(deeplAdresse(schluessel), {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${schluessel.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: anfrage.map((t) => t.text),
        source_lang: "DE",
        target_lang: ziel,
        preserve_formatting: true,
        ...(html ? { tag_handling: "html" } : {}),
      }),
    });
    if (!antwort.ok) throw new Error(fehlermeldung(antwort.status));
    const daten = (await antwort.json()) as { translations?: { text?: unknown }[] } | null;
    const zeilen = daten?.translations;
    if (!Array.isArray(zeilen) || zeilen.length !== anfrage.length) {
      throw new Error("DeepL hat nicht zu jedem Text eine Übersetzung geliefert.");
    }
    anfrage.forEach((t, i) => {
      const text = zeilen[i]?.text;
      if (typeof text === "string" && text.trim() !== "") ergebnis[t.schluessel] = text;
    });
  }
  return ergebnis;
}
