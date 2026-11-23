import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** All roles the user holds, e.g. ["vorstand", "mitglied"] */
  roles: string[];
  /** DB-sourced label map, e.g. { vorstand: "Vorstand" }. Falls back to key if unknown. */
  roleLabels: Record<string, string>;
  /** True if the user holds any role (= is an active member) */
  isMember: boolean;
  permissions: string[];
  /**
   * Sind Rollen und Rechte fertig geladen?
   *
   * `loading` sagt nur, ob die Sitzung steht – die Rechte kommen einen
   * Wimpernschlag spaeter nach. Wer sich danach richtet, was jemand darf,
   * braucht diese Angabe: `permissions.length > 0` taugt nicht, denn eine
   * Rolle ganz ohne Rechte ist erlaubt und waere dann fuer immer „laedt noch".
   */
  permissionsLoaded: boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  impersonatingRole: string | null;
  startImpersonation: (role: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [permissions, setPermissions] = useState<string[]>([]);
  const [realPermissions, setRealPermissions] = useState<string[]>([]);
  const [impersonatingRole, setImpersonatingRole] = useState<string | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const queryClient = useQueryClient();

  const isMember = roles.length > 0;

  /** Für wen die Rechte geladen sind, und wann – damit nicht jede Rückkehr in den Tab alles neu lädt. */
  const geladen = useRef<{ userId: string; zeit: number } | null>(null);

  /**
   * Rollen und Rechte laden – vier Abfragen, gleichzeitig (vorher
   * nacheinander). Schlägt eine fehl (Funkloch), gilt das NICHT als „keine
   * Rechte": Was schon geladen war, bleibt; beim ersten Laden wird zweimal
   * nachgefasst, bevor die Seite ohne Rechte weitermacht. Vorher sah ein
   * Mitglied nach einem Netzfehler aus wie ein Fremder.
   */
  const fetchRolesAndPermissions = async (userId: string, versuch = 0): Promise<void> => {
    const [profil, rollen, katalog, rechte] = await Promise.all([
      supabase.from("profiles").select("is_active").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.rpc("get_role_catalog"),
      supabase.rpc("get_user_permissions", { _user_id: userId }),
    ]);
    // Check if profile is active – if not, log out immediately
    if (profil.data && profil.data.is_active === false) {
      await supabase.auth.signOut();
      return;
    }
    if (rollen.error || rechte.error) {
      if (versuch < 2) {
        await new Promise((ok) => setTimeout(ok, 1500 * (versuch + 1)));
        return fetchRolesAndPermissions(userId, versuch + 1);
      }
      // Nichts überschreiben; nur das Warten beenden.
      setPermissionsLoaded(true);
      return;
    }
    setRoles((rollen.data ?? []).map((r) => r.role));
    // Role catalog for display labels (single source of truth from DB)
    if (katalog.data) {
      const labels: Record<string, string> = {};
      (katalog.data as { key: string; label: string }[]).forEach((r) => {
        labels[r.key] = r.label;
      });
      setRoleLabels(labels);
    }
    const perms = (rechte.data ?? []) as unknown as string[];
    setPermissions(perms);
    setRealPermissions(perms);
    setPermissionsLoaded(true);
    geladen.current = { userId, zeit: Date.now() };
  };

  const startImpersonation = useCallback(async (role: string) => {
    const { data } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role", role as any)
      .eq("granted", true);
    if (data) {
      setPermissions(data.map((r) => r.permission));
      setImpersonatingRole(role);
    }
  }, []);

  const stopImpersonation = useCallback(() => {
    setPermissions(realPermissions);
    setImpersonatingRole(null);
  }, [realPermissions]);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Die Sitzung meldet sich bei jeder Rückkehr in den Tab und bei
          // jedem erneuerten Schlüssel. Für dasselbe Konto wird nur neu
          // geladen, wenn der letzte Stand älter als fünf Minuten ist – so
          // greift eine entzogene Rolle oder ein deaktiviertes Konto
          // weiterhin bald, ohne vier Abfragen bei jedem Tabwechsel.
          const stand = geladen.current;
          const frisch = stand && stand.userId === session.user.id && Date.now() - stand.zeit < 5 * 60_000;
          if (!frisch) setTimeout(() => fetchRolesAndPermissions(session.user.id), 0);
        } else {
          geladen.current = null;
          setRoles([]);
          setRoleLabels({});
          setPermissions([]);
          setPermissionsLoaded(false);
        }
        setLoading(false);
        initialized = true;
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRolesAndPermissions(session.user.id);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Echtzeit: Wird das Konto deaktiviert, sofort abmelden.
  //
  // Kanalname mit Zufallsanteil, Abhaengigkeit auf die Nutzerkennung statt auf
  // das Objekt, und alles in try/catch. Ohne das reichte eine Token-Erneuerung:
  // Der Effekt lief erneut, supabase.channel() lieferte bei gleichem Namen den
  // bereits abonnierten Kanal, und .on() darauf wirft. Weil das hier im
  // AuthProvider passiert, der die gesamte Anwendung umschliesst, wurde daraus
  // eine weisse Seite.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`profile-active-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          async (payload) => {
            const next = payload.new as { is_active?: boolean };
            if (next?.is_active === false) {
              await supabase.auth.signOut();
              window.location.href = "/login?deactivated=1";
            }
          }
        )
        .subscribe();
    } catch (err) {
      // Eine gestoerte Echtzeitverbindung darf die Anmeldung nicht verhindern.
      console.warn("Echtzeitverbindung zum Profil nicht möglich:", err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Was für dieses Konto geladen war, darf der nächste am selben Gerät
    // nicht sehen – viele Abfragen tragen die Kennung des Kontos nicht im
    // Schlüssel und blieben sonst bis zu zwei Minuten stehen.
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        roleLabels,
        isMember,
        permissions,
        permissionsLoaded,
        hasPermission,
        signIn,
        signOut,
        impersonatingRole,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
