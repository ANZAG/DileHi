import type { Json } from "@/integrations/supabase/types";

/**
 * JSON-Spalten kennt die Datenbank nur als `Json`. Welche Form darin liegt,
 * legt die Anwendung fest – das kann der erzeugte Typ nicht wissen.
 *
 * Diese beiden Funktionen sind die einzige Stelle, an der diese Form behauptet
 * wird. Wer sie aufruft, nennt die Spalte und ihren Typ ausdrücklich; alles
 * andere an der Zeile (Tabelle, Spaltennamen, null) prüft weiter der Compiler.
 * Vorher stand dafür ein `as any` um die ganze Abfrage.
 */
export const ausJson = <T>(wert: Json): T => wert as unknown as T;

/** Gegenrichtung: ein Wert der Anwendung für eine JSON-Spalte oder ein JSON-Argument. */
export const alsJson = (wert: unknown): Json => wert as Json;
