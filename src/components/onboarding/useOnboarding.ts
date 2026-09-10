import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useModule, modulAn } from "@/hooks/useModule";
import { supabase } from "@/integrations/supabase/client";

/**
 * Der Stand der Einführung für die angemeldete Person.
 *
 * Eine Stelle für beides: die Aufgabenliste auf der Startseite und die
 * Führung mit der Hervorhebung. Sie zeigen dieselben Schritte an, also fragen
 * sie auch dasselbe.
 *
 * ── Warum eine Aufgabe sich selbst abhakt ──────────────────────────────────
 *
 * Ein Schritt mit `aufgabe` ist etwas, das jemand tut, nicht etwas, das
 * jemand liest. Ob es getan ist, weiss die Datenbank: Das Profil ist
 * ausgefüllt, ein Zelt ist eingetragen, es gibt eine Zusage. Deshalb gibt es
 * dafür kein Kästchen zum Anklicken – ein Kästchen, das man abhaken kann,
 * ohne die Sache getan zu haben, wäre nur eine höflichere Diashow.
 *
 * Wen eine Aufgabe nicht betrifft (kein Zelt, kein Interesse am Steckbrief),
 * der blendet sie aus. Das steht in user_tours mit dem Präfix „aufgabe:".
 */

export type Gruppe = "start" | "mitmachen" | "verwalten" | "einrichten";

export interface Schritt {
  key: string;
  gruppe: Gruppe;
  icon: string;
  titel: string;
  text: string;
  tipp: string | null;
  route: string | null;
  /** Das Element mit data-tour="<anker>" wird hervorgehoben. */
  anker: string | null;
  recht: string | null;
  modul: string | null;
  /** Gesetzt = echte Aufgabe, die sich selbst abhakt. */
  aufgabe: string | null;
  sort_order: number;
  is_active: boolean;
}

export const GRUPPEN: Record<Gruppe, string> = {
  start: "Zum Anfang",
  mitmachen: "Mitmachen",
  verwalten: "Verwalten",
  einrichten: "Einrichten",
};

const db = supabase as unknown as { from: (t: string) => any };

export function useOnboarding() {
  const { user, permissions, permissionsLoaded, hasPermission } = useAuth();
  const { data: module } = useModule();
  const queryClient = useQueryClient();

  const schritteQuery = useQuery({
    queryKey: ["onboarding-schritte"],
    queryFn: async (): Promise<Schritt[]> => {
      const { data, error } = await db
        .from("onboarding_schritte")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Schritt[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const erledigtQuery = useQuery({
    queryKey: ["onboarding-erledigt", user?.id],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("onboarding_erledigt" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as string[];
    },
    enabled: !!user,
    // Kurz, damit ein gerade ausgefülltes Profil beim nächsten Blick abgehakt
    // ist und nicht erst nach dem Neuladen.
    staleTime: 30 * 1000,
  });

  const merkzettelQuery = useQuery({
    queryKey: ["user_tours", user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_tours")
        .select("tour_key")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => d.tour_key);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  /** Was für diese Person gilt: Rechte und Module. */
  const gueltig = useMemo(
    () =>
      (schritteQuery.data ?? []).filter(
        (s) =>
          (!s.recht || hasPermission(s.recht)) && (!s.modul || modulAn(module, s.modul))
      ),
    // permissions statt hasPermission: Die Funktion ist bei jedem Aufbau neu,
    // die Liste dahinter nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schritteQuery.data, permissions, module]
  );

  const erledigt = useMemo(() => new Set(erledigtQuery.data ?? []), [erledigtQuery.data]);
  const merkzettel = useMemo(() => new Set(merkzettelQuery.data ?? []), [merkzettelQuery.data]);

  /** Die echten Aufgaben, mit ihrem Stand. */
  const aufgaben = useMemo(
    () =>
      gueltig
        .filter((s) => !!s.aufgabe)
        .filter((s) => !merkzettel.has(`aufgabe:${s.key}`))
        .map((s) => ({ ...s, fertig: erledigt.has(s.aufgabe!) })),
    [gueltig, erledigt, merkzettel]
  );

  /** Die Führung: alles, was gilt, in Reihenfolge. */
  const fuehrung = gueltig;

  const merken = useCallback(
    async (keys: string[]) => {
      if (!user || keys.length === 0) return;
      await supabase.from("user_tours").upsert(
        keys.map((k) => ({ user_id: user.id, tour_key: k })),
        { onConflict: "user_id,tour_key", ignoreDuplicates: true }
      );
      queryClient.invalidateQueries({ queryKey: ["user_tours", user.id] });
    },
    [user, queryClient]
  );

  /** Eine Aufgabe betrifft mich nicht. */
  const ausblenden = useCallback((key: string) => merken([`aufgabe:${key}`]), [merken]);

  const einblenden = useCallback(
    async (key: string) => {
      if (!user) return;
      await supabase
        .from("user_tours")
        .delete()
        .eq("user_id", user.id)
        .eq("tour_key", `aufgabe:${key}`);
      queryClient.invalidateQueries({ queryKey: ["user_tours", user.id] });
    },
    [user, queryClient]
  );

  return {
    fuehrung,
    aufgaben,
    /** Wieviele Aufgaben erledigt sind. */
    fortschritt: {
      fertig: aufgaben.filter((a) => a.fertig).length,
      gesamt: aufgaben.length,
    },
    bereit:
      !!user && permissionsLoaded && !!module &&
      schritteQuery.isSuccess && erledigtQuery.isSuccess && merkzettelQuery.isSuccess,
    gesehen: merkzettel,
    merken,
    ausblenden,
    einblenden,
    /** Nach einer Änderung neu nachsehen, was erledigt ist. */
    neuPruefen: () =>
      queryClient.invalidateQueries({ queryKey: ["onboarding-erledigt", user?.id] }),
  };
}

/** Die Führung öffnen, wahlweise bei einem bestimmten Schritt. */
export function fuehrungStarten(key?: string) {
  window.dispatchEvent(new CustomEvent("start-onboarding", { detail: { key } }));
}
