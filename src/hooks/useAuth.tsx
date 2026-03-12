import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isVorstand: boolean;
  isMember: boolean;
  isHerold: boolean;
  isSchatzmeister: boolean;
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
  const [isVorstand, setIsVorstand] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isHerold, setIsHerold] = useState(false);
  const [isSchatzmeister, setIsSchatzmeister] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchRolesAndPermissions = async (userId: string) => {
    // Fetch roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesData) {
      const roles = rolesData.map((r) => r.role);
      setIsVorstand(roles.includes("vorstand"));
      setIsHerold(roles.includes("herold"));
      setIsSchatzmeister(roles.includes("schatzmeister"));
      setIsMember(roles.length > 0);
    }

    // Fetch permissions
    const { data: permsData } = await supabase.rpc("get_user_permissions", {
      _user_id: userId,
    });
    if (permsData) {
      setPermissions(permsData as unknown as string[]);
    }
  };

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRolesAndPermissions(session.user.id), 0);
        } else {
          setIsVorstand(false);
          setIsHerold(false);
          setIsSchatzmeister(false);
          setIsMember(false);
          setPermissions([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRolesAndPermissions(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isVorstand, isMember, isHerold, isSchatzmeister, permissions, hasPermission, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
