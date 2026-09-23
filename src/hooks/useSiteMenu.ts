import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { vorabzug } from "@/lib/vorabzug";

export interface MenuEintrag {
  path: string;
  label: string;
  opensNew?: boolean;
  children?: MenuEintrag[];
}

/**
 * Was unter einem Menüpunkt mit Unterpunkten aufklappt.
 *
 * Der Punkt selbst steht mit darin – er zeigt auf eine eigene Seite, und die
 * soll erreichbar bleiben, obwohl ein Klick auf ihn nur aufklappt. Außer ein
 * Unterpunkt führt schon dorthin: Dann stünde dieselbe Seite zweimal in der
 * Liste, einmal unter falschem Namen. So ist es auf der nachgebauten
 * Vorlage, wo „Info" auf „Historie der Gruppe" zeigt.
 */
export function aufgeklappt(eintrag: MenuEintrag): MenuEintrag[] {
  const kinder = eintrag.children ?? [];
  return kinder.some((k) => k.path === eintrag.path) ? kinder : [eintrag, ...kinder];
}

/**
 * Wo ein Eintrag erscheint. Die Kopfzeile wird im Fußbereich als Spalte
 * „Navigation" gespiegelt – deshalb gibt es dafür keinen eigenen Bereich.
 */
export type MenuBereich = "header" | "footer_legal";

interface Zeile {
  id: string;
  label: string;
  page_id: string | null;
  href: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  opens_new: boolean;
  area: MenuBereich | null;
}

/**
 * Solange die Datenbank leer ist oder die Abfrage scheitert.
 *
 * Hier standen bis zum Probelauf DileHis sieben Menüpunkte — Spätmittelalter,
 * Napoleonik, Erster Weltkrieg, Für Veranstalter, Über uns, Kontakt. Eine
 * fremde Installation, deren Abfrage einmal scheitert, hätte damit das Menü
 * eines fremden Vereins angezeigt, mit Links auf Seiten, die es bei ihr nicht
 * gibt. „Eine Website ohne Menü ist schlimmer als eine mit dem falschen" war
 * der Gedanke; er stimmt nicht, sobald das falsche Menü einem anderen gehört.
 *
 * Geblieben ist die Startseite — die gibt es in jeder Installation.
 */
const FALLBACK: Record<MenuBereich, MenuEintrag[]> = {
  header: [{ path: "/", label: "Startseite" }],
  // Hier ist der Notnagel nicht nur Bequemlichkeit: Ohne erreichbares
  // Impressum ist die Seite abmahnfähig. Wer die Einträge bewusst löscht,
  // bekommt sie deshalb zurück.
  footer_legal: [
    { path: "/impressum", label: "Impressum" },
    { path: "/datenschutz", label: "Datenschutz" },
  ],
};

/**
 * Aus den Zeilen der Tabelle das Menü bauen – geteilt von der Abfrage und
 * dem Stand vom Bauen (siehe `vorabzug`).
 */
function menueBauen(zeilen: Zeile[], seiten: Map<string, string>): Record<MenuBereich, MenuEintrag[]> {
  const zuEintrag = (z: Zeile): MenuEintrag | null => {
    const path = z.page_id ? seiten.get(z.page_id) : z.href;
    // Ein Menüpunkt ohne Ziel ist ein Link ins Leere – lieber weglassen.
    if (!path) return null;
    return { path, label: z.label, opensNew: z.opens_new };
  };

  const bauen = (fuer: MenuBereich): MenuEintrag[] => {
    // Steht die Spalte noch nicht in der Datenbank (Migration nicht
    // eingespielt), gilt alles als Kopfzeile – wie vorher.
    const eigene = zeilen.filter((z) => (z.area ?? "header") === fuer);
    return eigene
      .filter((z) => !z.parent_id)
      .map((z) => {
        const eintrag = zuEintrag(z);
        if (!eintrag) return null;
        const kinder = eigene
          .filter((k) => k.parent_id === z.id)
          .map(zuEintrag)
          .filter((k): k is MenuEintrag => k !== null);
        return kinder.length > 0 ? { ...eintrag, children: kinder } : eintrag;
      })
      .filter((e): e is MenuEintrag => e !== null);
  };

  return { header: bauen("header"), footer_legal: bauen("footer_legal") };
}

/**
 * Das Menü aus der Datenbank.
 *
 * Bisher stand es als Array im Layout – für eine Installation, die ein anderer
 * Verein aufsetzt, hiess das: Er bekommt unsere Epochen ins Menü und braucht
 * einen Entwickler, um das zu ändern.
 *
 * Einträge zeigen entweder auf eine Seite aus site_pages oder auf eine feste
 * Adresse. Solange die alten Seiten noch im Code liegen, ist es die Adresse;
 * beim Umstellen einer Seite auf den Editor wandert der Eintrag auf page_id.
 *
 * Alle Bereiche kommen aus einer Abfrage. Das Layout ruft den Hook zweimal
 * auf – react-query fasst das über den gleichen Schlüssel zusammen, es bleibt
 * bei einer Anfrage.
 */
export function useSiteMenu(bereich: MenuBereich = "header"): MenuEintrag[] {
  const { data } = useQuery({
    queryKey: ["site-menu"],
    queryFn: async (): Promise<Record<MenuBereich, MenuEintrag[]>> => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string) => Promise<{ data: Zeile[] | null; error: { message: string } | null }>;
          };
        };
      })
        .from("site_menu")
        .select("*")
        .order("sort_order");
      if (error) throw new Error(error.message);

      const zeilen = (data ?? []).filter((z) => z.is_visible);
      const seiten = new Map<string, string>();

      // Verweise auf Seiten in Adressen auflösen.
      const seitenIds = zeilen.map((z) => z.page_id).filter((v): v is string => !!v);
      if (seitenIds.length > 0) {
        const { data: pages } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              in: (c: string, v: string[]) => Promise<{ data: { id: string; slug: string }[] | null }>;
            };
          };
        })
          .from("site_pages")
          .select("id, slug")
          .in("id", seitenIds);
        for (const p of pages ?? []) seiten.set(p.id, `/${p.slug}`);
      }

      return menueBauen(zeilen, seiten);
    },
    // Der Stand vom Bauen, damit das Menü nicht erst als Notnagel erscheint.
    initialData: () => {
      const v = vorabzug()?.menue;
      if (!v || !Array.isArray(v.zeilen)) return undefined;
      const zeilen = (v.zeilen as Zeile[]).filter((z) => z.is_visible);
      return menueBauen(zeilen, new Map(Object.entries(v.seiten ?? {})));
    },
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const eintraege = data?.[bereich] ?? [];
  return eintraege.length > 0 ? eintraege : FALLBACK[bereich];
}
