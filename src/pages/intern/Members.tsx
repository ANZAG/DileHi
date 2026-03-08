import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  vorstand: "Vorstand",
  mitglied: "Mitglied",
  herold: "Herold",
  schatzmeister: "Schatzmeister",
};

const Members = () => {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-directory"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) throw rolesErr;

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, phone, is_active, entry_date")
        .in("id", userIds);
      if (profErr) throw profErr;

      return profiles
        .filter((p) => p.is_active !== false)
        .map((p) => ({
          ...p,
          roles: roles
            .filter((r) => r.user_id === p.id)
            .map((r) => r.role),
        }))
        .sort((a, b) => (a.display_name || "").localeCompare(b.display_name || ""));
    },
  });

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6">Mitgliederverzeichnis</h1>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : (
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {m.first_name && m.last_name
                      ? `${m.first_name} ${m.last_name}`
                      : m.display_name}
                  </p>
                  {m.entry_date && (
                    <p className="text-xs text-muted-foreground">
                      Mitglied seit {new Date(m.entry_date).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.roles.map((r: string) => (
                    <Badge key={r} variant="secondary" className="text-xs">
                      {ROLE_LABELS[r] || r}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-4">
              {members.length} aktive Mitglieder
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Members;
