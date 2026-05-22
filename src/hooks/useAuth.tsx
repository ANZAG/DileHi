import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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

  const isMember = roles.length > 0;

  const fetchRolesAndPermissions = async (userId: string) => {
    // Check if profile is active – if not, log out immediately
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", userId)
      .maybeSingle();
    if (profileData && profileData.is_active === false) {
      await supabase.auth.signOut();
      return;
    }

    // Fetch roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesData) {
      setRoles(rolesData.map((r) => r.role));
    }

    // Fetch role catalog for display labels (single source of truth from DB)
    const { data: catalogData } = await supabase.rpc("get_role_catalog");
    if (catalogData) {
      const labels: Record<string, string> = {};
      (catalogData as { key: string; label: string }[]).forEach((r) => {
        labels[r.key] = r.label;
      });
      setRoleLabels(labels);
    }

    // Fetch permissions
    const { data: permsData } = await supabase.rpc("get_user_permissions", {
      _user_id: userId,
    });
    if (permsData) {
      const perms = permsData as unknown as string[];
      setPermissions(perms);
      setRealPermissions(perms);
    }
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
          setTimeout(() => fetchRolesAndPermissions(session.user.id), 0);
        } else {
          setRoles([]);
          setRoleLabels({});
          setPermissions([]);
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

  // Realtime: if the current user is deactivated, log them out immediately
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-active-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async (payload) => {
          const next = payload.new as { is_active?: boolean };
          if (next?.is_active === false) {
            await supabase.auth.signOut();
            window.location.href = "/login?deactivated=1";
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
