import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useModule, modulAn } from "@/hooks/useModule";
import { supabase } from "@/integrations/supabase/client";
import { passendeSchritte, type Schritt } from "./schritte";

/**
 * Der Stand der Einführungstour für die angemeldete Person.
 *
 * Zwei Dinge nutzen ihn: das Overlay (OnboardingTour) und die Liste auf der
 * Startseite (ErsteSchritte). Beide zeigen dasselbe an, also fragen sie auch
 * dasselbe – sonst hätten wir wieder zwei Wahrheiten, die auseinanderlaufen.
 */
export function useTour() {
  const { user, permissions, permissionsLoaded, hasPermission } = useAuth();
  const { data: module } = useModule();
  const queryClient = useQueryClient();

  const gesehenQuery = useQuery({
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

  /** Was für diese Person überhaupt in Frage kommt: Rechte und Module. */
  const moeglich = useMemo(
    () => passendeSchritte(hasPermission, (m) => modulAn(module, m)),
    // permissions statt hasPermission: Die Funktion ist bei jedem Aufbau neu,
    // die Liste dahinter nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, module]
  );

  const gesehen = useMemo(() => new Set(gesehenQuery.data ?? []), [gesehenQuery.data]);
  const offen: Schritt[] = useMemo(
    () => moeglich.filter((s) => !gesehen.has(s.key)),
    [moeglich, gesehen]
  );

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

  return {
    /** Alles, was diese Person sehen darf – auch schon Gesehenes. */
    moeglich,
    /** Was davon noch aussteht. */
    offen,
    /**
     * Steht der Stand fest? Vorher darf nichts als „gesehen“ gelten.
     *
     * Rechte und Module muessen geladen sein: Sonst faellt die halbe Tour weg,
     * und wer sie wegklickt, hat die fehlenden Schritte nie gesehen und
     * bekommt sie trotzdem nicht mehr.
     */
    bereit: !!user && permissionsLoaded && !!module && gesehenQuery.isSuccess,
    merken,
  };
}

/** Die Tour öffnen, wahlweise bei einem bestimmten Schritt. */
export function tourStarten(key?: string) {
  window.dispatchEvent(new CustomEvent("start-onboarding", { detail: { key } }));
}
