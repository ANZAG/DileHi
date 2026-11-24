import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nachgebaute Datenbank für die Tests der Datenschicht (`src/daten`).
 *
 * Jeder Aufruf von `supabase.from()` und `supabase.rpc()` wird mitgeschrieben
 * und bekommt die Antwort, die der Test vorgibt – unter dem Namen
 * „<erster Schritt> <Tabelle>" (`select votes`, `update elections`) bzw.
 * „rpc <Funktion>". Ohne Vorgabe antwortet sie mit `{ data: [], error: null }`.
 * Eine Liste von Antworten wird der Reihe nach verbraucht; die letzte bleibt.
 */

export type Antwort = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null };

export type Aufruf = {
  /** „select votes", „insert group_members", „rpc cast_votes" */
  was: string;
  /** Was dem ersten Schritt übergeben wurde: die Zeilen, die Änderung, die Spalten, die Argumente. */
  wert?: unknown;
  /** Alle Schritte der Kette in ihrer Reihenfolge, z. B. ["eq", "id", "a"]. */
  schritte: unknown[][];
};

const ERSTE_SCHRITTE = ["select", "insert", "update", "delete", "upsert"];

export function datenbank(antworten: Record<string, Antwort | Antwort[]> = {}) {
  const aufrufe: Aufruf[] = [];
  const verbraucht: Record<string, number> = {};

  const antwortAuf = (was: string): Antwort => {
    const vorgabe = antworten[was];
    let antwort: Antwort | undefined;
    if (Array.isArray(vorgabe)) {
      const n = verbraucht[was] ?? 0;
      verbraucht[was] = n + 1;
      antwort = vorgabe[Math.min(n, vorgabe.length - 1)];
    } else {
      antwort = vorgabe;
    }
    return { data: [], error: null, count: null, ...antwort };
  };

  vi.spyOn(supabase, "rpc").mockImplementation(((name: string, argumente?: unknown) => {
    aufrufe.push({ was: `rpc ${name}`, wert: argumente, schritte: [] });
    return Promise.resolve(antwortAuf(`rpc ${name}`));
  }) as never);

  vi.spyOn(supabase, "from").mockImplementation(((tabelle: string) => {
    const aufruf: Aufruf = { was: `? ${tabelle}`, schritte: [] };
    aufrufe.push(aufruf);
    const kette: unknown = new Proxy(
      {},
      {
        get: (_ziel, schritt: string) => {
          // Die Kette ist selbst das Versprechen – wie beim echten Client.
          if (schritt === "then") {
            return (ja: (a: Antwort) => unknown, nein: (e: unknown) => unknown) =>
              Promise.resolve(antwortAuf(aufruf.was)).then(ja, nein);
          }
          return (...argumente: unknown[]) => {
            if (aufruf.was.startsWith("?") && ERSTE_SCHRITTE.includes(schritt)) {
              aufruf.was = `${schritt} ${tabelle}`;
              aufruf.wert = argumente[0];
            }
            aufruf.schritte.push([schritt, ...argumente]);
            return kette;
          };
        },
      },
    );
    return kette;
  }) as never);

  return aufrufe;
}

/** Die Filter eines Aufrufs als „spalte=wert", damit ein Test sie knapp prüfen kann. */
export const filterVon = (aufruf: Aufruf): string[] =>
  aufruf.schritte
    .filter(([schritt]) => ["eq", "neq", "in", "is", "gte", "lte", "gt", "lt"].includes(String(schritt)))
    .map(([schritt, spalte, wert]) => `${String(spalte)} ${String(schritt)} ${JSON.stringify(wert)}`);
