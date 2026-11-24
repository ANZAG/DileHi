import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ZUSATZSPRACHEN, istSprache, sprachPfad, spracheVonPfad, type Sprache, type Zusatzsprache,
} from "@/lib/sprachen.mjs";
import { TEXTE, type Texte } from "@/lib/texte";
import { vorabzug } from "@/lib/vorabzug";

/**
 * In welcher Sprache die Seite gerade spricht.
 *
 * Die Sprache steht in der Adresse (/en/…, /fr/…) und nirgends sonst: Eine
 * Adresse zeigt für jeden dasselbe, ob Mensch oder Suchmaschine, und ein
 * geteilter Link führt in die Sprache, in der er geteilt wurde. Was der
 * Besucher zuletzt gewählt hat, entscheidet nur beim Ankommen auf einer
 * deutschen Adresse (SprachWeiche).
 */
export function useSprache(): { sprache: Sprache; t: Texte; pfad: (adresse: string) => string } {
  const { pathname } = useLocation();
  const sprache = spracheVonPfad(pathname);
  return useMemo(
    () => ({ sprache, t: TEXTE[sprache], pfad: (adresse: string) => sprachPfad(adresse, sprache) }),
    [sprache],
  );
}

// ── Die Wahl des Besuchers ──────────────────────────────────────────────────

const GEWAEHLT = "seite-sprache";
const ERKANNT = "seite-sprache-erkannt";

const lesen = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const schreiben = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ohne Merker */ } };

/** Was der Besucher in der Sprachwahl angeklickt hat – sonst null. */
export function gewaehlteSprache(): Sprache | null {
  const wert = lesen(GEWAEHLT);
  return istSprache(wert) ? wert : null;
}

export function spracheMerken(sprache: Sprache) {
  schreiben(GEWAEHLT, sprache);
}

/** Wurde die Browsersprache schon einmal ausgewertet? Das geschieht genau einmal. */
export const browserspracheGeprueft = () => lesen(ERKANNT) === "1";
export const browserspracheAbhaken = () => schreiben(ERKANNT, "1");

// ── Was es in den anderen Sprachen gibt ─────────────────────────────────────

const nurZusatz = (werte: unknown): Zusatzsprache[] =>
  ZUSATZSPRACHEN.filter((s) => Array.isArray(werte) && werte.includes(s));

/**
 * Die Sprachen, in denen wenigstens eine veröffentlichte Seite vorliegt.
 *
 * Danach richten sich Sprachwahl und Weiche. Scheitert die Abfrage – etwa
 * weil die Migration noch nicht eingespielt ist –, gibt es keine: Die Seite
 * bleibt dann schlicht deutsch.
 */
export function useAngeboteneSprachen(): { sprachen: Zusatzsprache[]; bekannt: boolean } {
  const { data } = useQuery({
    queryKey: ["site-languages"],
    queryFn: async (): Promise<Zusatzsprache[]> => {
      const { data, error } = await supabase.rpc("site_languages");
      if (error) return [];
      return nurZusatz(data);
    },
    initialData: () => {
      const v = vorabzug()?.sprachen;
      return Array.isArray(v) ? nurZusatz(v) : undefined;
    },
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  return { sprachen: data ?? [], bekannt: data !== undefined };
}

/**
 * Die übersetzten Menüpunkte und Rahmentexte der aktuellen Sprache,
 * Schlüssel „menu:<id>" bzw. „settings:<spalte>". Auf Deutsch leer – das
 * Original steht im Menü und in den Vereinsangaben selbst.
 */
export function useRahmentexte(): Record<string, string> {
  const { sprache } = useSprache();
  const { data } = useQuery({
    queryKey: ["site-texte", sprache],
    enabled: sprache !== "de",
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("site_text_translations")
        .select("kind, ref, value")
        .eq("lang", sprache);
      if (error) return {};
      return Object.fromEntries((data ?? []).map((z) => [`${z.kind}:${z.ref}`, z.value]));
    },
    initialData: () => vorabzug()?.texte?.[sprache],
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  return (sprache !== "de" && data) || LEER;
}

const LEER: Record<string, string> = {};
