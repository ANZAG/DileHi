import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useModule, modulAn } from "@/hooks/useModule";
import { supabase } from "@/integrations/supabase/client";

/**
 * Die Einführung im Mitgliederbereich.
 *
 * ── Zwei Ebenen ────────────────────────────────────────────────────────────
 *
 * Der Rundgang (`start`) zeigt einmal die Startseite: was liegt wo. Die
 * Bereichstouren erklären, wie man in einem Bereich arbeitet. Beides steht in
 * `onboarding_steps`, unterschieden durch die Spalte `tour`.
 *
 * ── Wer was sieht ──────────────────────────────────────────────────────────
 *
 * `permission` und `module` an jedem Schritt. Keine Rollenabfrage: Wer einer eigenen
 * Rolle das passende Recht gibt, bekommt den Schritt.
 *
 * ── Was gemerkt wird ───────────────────────────────────────────────────────
 *
 * Alles in `user_tours`, also in der Datenbank und nicht im Browser. Ein
 * Gerätewechsel soll weder die Einführung zurückholen noch sie verlieren.
 *
 *   <key>              Diesen Schritt hat die Person gesehen.
 *   aufgabe:<key>      Diese Aufgabe betrifft sie nicht.
 *   streifen:<tour>    Das Angebot „Neu hier?" in diesem Bereich ist weg.
 */

export interface Schritt {
  key: string;
  tour: string;
  icon: string;
  title: string;
  text: string;
  tip: string | null;
  route: string | null;
  /** Das Element mit data-tour="<anchor>" wird hervorgehoben. */
  anchor: string | null;
  permission: string | null;
  module: string | null;
  /** Gesetzt = echte Aufgabe, die sich selbst abhakt. */
  task: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Aufgabe extends Schritt {
  fertig: boolean;
}

const db = supabase as unknown as { from: (t: string) => any };

export function useOnboarding() {
  const { user, permissions, permissionsLoaded, hasPermission } = useAuth();
  const { data: module } = useModule();
  const queryClient = useQueryClient();

  const schritteQuery = useQuery({
    queryKey: ["onboarding-schritte"],
    queryFn: async (): Promise<Schritt[]> => {
      const { data, error } = await db
        .from("onboarding_steps")
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
      const { data, error } = await supabase.rpc("onboarding_completed_tasks" as never);
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

  /** Alles, was für diese Person gilt – über alle Touren. */
  const gueltig = useMemo(
    () =>
      (schritteQuery.data ?? []).filter(
        (s) =>
          (!s.permission || hasPermission(s.permission)) && (!s.module || modulAn(module, s.module))
      ),
    // permissions statt hasPermission: Die Funktion ist bei jedem Aufbau neu,
    // die Liste dahinter nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schritteQuery.data, permissions, module]
  );

  const erledigt = useMemo(() => new Set(erledigtQuery.data ?? []), [erledigtQuery.data]);
  const merkzettel = useMemo(() => new Set(merkzettelQuery.data ?? []), [merkzettelQuery.data]);

  const bereit =
    !!user && permissionsLoaded && !!module &&
    schritteQuery.isSuccess && erledigtQuery.isSuccess && merkzettelQuery.isSuccess;

  /** Die Schritte einer Tour, in Reihenfolge. */
  const schritteFuer = useCallback(
    (tour: string) => gueltig.filter((s) => s.tour === tour && !s.task),
    [gueltig]
  );

  /**
   * Bietet sich diese Tour gerade an?
   *
   * Nur, wenn es überhaupt etwas zu zeigen gibt, noch kein Schritt gesehen
   * wurde und das Angebot nicht schon weggeklickt ist. Wer die Tour einmal
   * begonnen hat, bekommt den Streifen nicht wieder – er hat sie gefunden.
   */
  const streifenOffen = useCallback(
    (tour: string) => {
      if (!bereit) return false;
      if (merkzettel.has(`streifen:${tour}`)) return false;
      const schritte = schritteFuer(tour);
      if (schritte.length === 0) return false;
      return !schritte.some((s) => merkzettel.has(s.key));
    },
    [bereit, merkzettel, schritteFuer]
  );

  /** Die Aufgaben im Profil, mit ihrem Stand. */
  const aufgaben: Aufgabe[] = useMemo(
    () =>
      gueltig
        .filter((s) => !!s.task)
        .filter((s) => !merkzettel.has(`aufgabe:${s.key}`))
        .map((s) => ({ ...s, fertig: erledigt.has(s.task!) })),
    [gueltig, erledigt, merkzettel]
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
    bereit,
    schritteFuer,
    streifenOffen,
    /** Das Angebot in diesem Bereich nicht mehr zeigen. */
    streifenSchliessen: (tour: string) => merken([`streifen:${tour}`]),
    aufgaben,
    fortschritt: {
      fertig: aufgaben.filter((a) => a.fertig).length,
      gesamt: aufgaben.length,
    },
    merken,
    /** Diese Aufgabe betrifft mich nicht. */
    ausblenden: (key: string) => merken([`aufgabe:${key}`]),
  };
}

/** Eine Tour öffnen, wahlweise bei einem bestimmten Schritt. */
export function fuehrungStarten(tour: string, key?: string) {
  window.dispatchEvent(new CustomEvent("start-onboarding", { detail: { tour, key } }));
}
