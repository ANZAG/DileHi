import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuEintrag {
  path: string;
  label: string;
  opensNew?: boolean;
  children?: MenuEintrag[];
}

interface Zeile {
  id: string;
  label: string;
  page_id: string | null;
  href: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  opens_new: boolean;
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
 */
export function useSiteMenu(): MenuEintrag[] {
  const { data } = useQuery({
    queryKey: ["site-menu"],
    queryFn: async (): Promise<MenuEintrag[]> => {
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

      const zuEintrag = (z: Zeile): MenuEintrag | null => {
        const path = z.page_id ? seiten.get(z.page_id) : z.href;
        // Ein Menüpunkt ohne Ziel ist ein Link ins Leere – lieber weglassen.
        if (!path) return null;
        return { path, label: z.label, opensNew: z.opens_new };
      };

      const oben = zeilen.filter((z) => !z.parent_id);
      return oben
        .map((z) => {
          const eintrag = zuEintrag(z);
          if (!eintrag) return null;
          const kinder = zeilen
            .filter((k) => k.parent_id === z.id)
            .map(zuEintrag)
            .filter((k): k is MenuEintrag => k !== null);
          return kinder.length > 0 ? { ...eintrag, children: kinder } : eintrag;
        })
        .filter((e): e is MenuEintrag => e !== null);
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  return data ?? [];
}
