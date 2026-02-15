import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, UserPlus, Trash2, Shield, User } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const { isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"mitglied" | "vorstand">("mitglied");

  if (!isVorstand) return <Navigate to="/intern" replace />;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Fetch profiles separately
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      return roles.map((r) => ({
        ...r,
        display_name: profiles?.find((p) => p.id === r.user_id)?.display_name ?? "–",
      }));
    },
  });

  const inviteMember = useMutation({
    mutationFn: async () => {
      // Use edge function to invite
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email, role },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setEmail("");
      toast({ title: "Einladung versendet" });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Rolle entfernt" });
    },
  });

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-6">Mitgliederverwaltung</h1>

        <div className="p-4 rounded-lg border bg-card mb-8 space-y-3">
          <h2 className="font-semibold text-sm">Neues Mitglied einladen</h2>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "mitglied" | "vorstand")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="mitglied">Mitglied</option>
              <option value="vorstand">Vorstand</option>
            </select>
            <button
              onClick={() => email && inviteMember.mutate()}
              disabled={!email || inviteMember.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <UserPlus size={16} /> Einladen
            </button>
          </div>
        </div>

        <h2 className="font-serif text-lg font-semibold mb-4">Aktuelle Mitglieder</h2>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Laden...</div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  {m.role === "vorstand" ? <Shield size={16} className="text-primary" /> : <User size={16} className="text-muted-foreground" />}
                  <div>
                    <span className="text-sm font-medium">{m.display_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.role === "vorstand" ? "Vorstand" : "Mitglied"}</span>
                  </div>
                </div>
                <button onClick={() => removeMember.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Admin;
