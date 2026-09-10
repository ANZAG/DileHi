import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Die Rolle, die ein neu eingeladenes Mitglied bekommt.
 *
 * Stand als „mitglied" fest im Programm – an vier Stellen. In einer
 * Installation, die ihre Rollen selbst benennt, gibt es die vielleicht gar
 * nicht, und eine Einladung wäre dann nicht abzuschicken.
 *
 * Ohne hinterlegte Standardrolle die unterste im Katalog: Die Reihenfolge ist
 * absteigend nach Verantwortung, unten steht also die einfachste Rolle. Ein
 * geratener Wert ist hier besser als gar keiner, weil sonst der Knopf zum
 * Einladen ins Leere führt.
 */
export function useDefaultRole(): string {
  const { data } = useQuery({
    queryKey: ["default-role"],
    queryFn: async (): Promise<string> => {
      const db = supabase as unknown as { from: (t: string) => any };
      const { data: einstellung } = await db
        .from("app_settings")
        .select("default_role")
        .maybeSingle();
      if (einstellung?.default_role) return einstellung.default_role as string;

      const { data: katalog } = await db
        .from("role_catalog")
        .select("key")
        .order("sort_order", { ascending: false })
        .limit(1);
      return (katalog?.[0]?.key as string) ?? "";
    },
    staleTime: 10 * 60 * 1000,
  });
  return data ?? "";
}
