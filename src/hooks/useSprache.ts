import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ladeAngeboteneSprachen, ladeRahmentexte, sprachSchluessel } from "@/daten/sprachen";
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
  const { data, isPending } = useQuery({
    queryKey: sprachSchluessel.angeboten(),
    queryFn: ladeAngeboteneSprachen,
    initialData: () => {
      const v = vorabzug()?.sprachen;
      return Array.isArray(v) ? nurZusatz(v) : undefined;
    },
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  // Auch eine gescheiterte Abfrage ist eine Auskunft: keine Sprachen.
  return { sprachen: data ?? [], bekannt: !isPending };
}

/**
 * Die übersetzten Menüpunkte und Rahmentexte der aktuellen Sprache,
 * Schlüssel „menu:<id>" bzw. „settings:<spalte>". Auf Deutsch leer – das
 * Original steht im Menü und in den Vereinsangaben selbst.
 */
export function useRahmentexte(): Record<string, string> {
  const { sprache } = useSprache();
  const { data } = useQuery({
    queryKey: sprachSchluessel.rahmentexteIn(sprache),
    enabled: sprache !== "de",
    // Scheitert die Abfrage, bleibt `data` leer und das Menü deutsch.
    queryFn: () => ladeRahmentexte(sprache as Zusatzsprache),
    initialData: () => vorabzug()?.texte?.[sprache],
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  return (sprache !== "de" && data) || LEER;
}

const LEER: Record<string, string> = {};
