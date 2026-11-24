import { useMemo } from "react";
import { useRahmentexte, useSprache } from "@/hooks/useSprache";
import { useSiteMenu, type MenuBereich, type MenuEintrag } from "@/hooks/useSiteMenu";
import type { Texte } from "@/lib/texte";

/**
 * Die Punkte des Notmenüs (useSiteMenu, FALLBACK) haben keine Zeile in der
 * Datenbank und damit keine Übersetzung. Ihre Namen kennt die Anwendung.
 */
const notname = (pfad: string, t: Texte): string | undefined =>
  ({ "/": t.startseite, "/impressum": t.impressum, "/datenschutz": t.datenschutz })[pfad];

/**
 * Das Menü in der Sprache der Adresse.
 *
 * Zwei Dinge ändern sich gegenüber dem deutschen: Der Name kommt aus der
 * Übersetzung, wenn es eine gibt, und die Ziele bleiben in der Sprache
 * (/verein → /en/verein). Fremde Adressen und alles, was es nur auf Deutsch
 * gibt, bleiben, wie sie sind.
 */
export function useSiteMenuInSprache(bereich: MenuBereich = "header"): MenuEintrag[] {
  const eintraege = useSiteMenu(bereich);
  const { sprache, t, pfad } = useSprache();
  const texte = useRahmentexte();

  return useMemo(() => {
    if (sprache === "de") return eintraege;
    const uebersetzt = (e: MenuEintrag): MenuEintrag => ({
      ...e,
      path: pfad(e.path),
      label: (e.id ? texte[`menu:${e.id}`] : notname(e.path, t)) ?? e.label,
      children: e.children?.map(uebersetzt),
    });
    return eintraege.map(uebersetzt);
  }, [eintraege, sprache, t, pfad, texte]);
}
