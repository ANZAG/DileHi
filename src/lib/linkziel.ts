/**
 * Ziele von Links, die jemand im Seitenbaukasten oder im Menü einträgt.
 *
 * Hintergrund (Sicherheitsprüfung 28.11.2026): Die Bausteine Karte, Knopf,
 * Logo, Hinweiskasten und Aktionsknopf setzten das eingetragene Ziel
 * ungeprüft als Adresse. Ein `javascript:…` dort lief beim Klick im Browser
 * jedes Besuchers – auch eines Vorstands, dessen Sitzung das Skript dann
 * hätte übernehmen können. Wer Seiten bearbeiten darf, ist aber nicht
 * zwingend Vorstand.
 *
 * Erlaubt sind deshalb nur Adressen ohne Schema (eigene Seiten wie
 * `/kontakt`, Anker wie `#termine`) und die Schemata http, https, mailto und
 * tel. Dieselbe Liste benutzt das Vorabrendern (`auffindbarkeit.mjs`).
 */

const ERLAUBTE_SCHEMATA = new Set(["http", "https", "mailto", "tel"]);

/**
 * Das Ziel, wenn es harmlos ist – sonst `null`.
 *
 * Browser übergehen beim Erkennen des Schemas Leer- und Steuerzeichen
 * (`java\tscript:` ist `javascript:`). Geprüft wird deshalb die Fassung ohne
 * diese Zeichen; zurück kommt das Ziel, wie es eingetragen ist.
 */
export function sicheresZiel(ziel: string | null | undefined): string | null {
  if (typeof ziel !== "string") return null;
  const eingetragen = ziel.trim();
  if (!eingetragen) return null;
  // eslint-disable-next-line no-control-regex
  const bereinigt = eingetragen.replace(/[\u0000- \u007f]/g, "");
  const schema = /^([a-z][a-z0-9+.-]*):/i.exec(bereinigt);
  if (schema && !ERLAUBTE_SCHEMATA.has(schema[1].toLowerCase())) return null;
  return eingetragen;
}

/** Führt das (geprüfte) Ziel aus der eigenen Seite hinaus? Dann kein Router-Link. */
export function istFremdeAdresse(ziel: string): boolean {
  return /^https?:/i.test(ziel);
}
