import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, UserPlus, Trash2, Shield, User, FileText, Pencil, KeyRound, X, Crown, Mail } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import SourcesAdmin from "@/components/admin/SourcesAdmin";

const ROLES = [
  { value: "mitglied", label: "Mitglied", icon: User },
  { value: "vorstand", label: "Vorstand", icon: Shield },
  { value: "herold", label: "Herold", icon: Crown },
];

const Admin = () => {
  const { isVorstand, isHerold } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("mitglied");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  // Accessible to Vorstand and Herold
  if (!isVorstand && !isHerold) return <Navigate to="/intern" replace />;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    enabled: isVorstand,
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
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

  const { data: contactMessages = [] } = useQuery({
    queryKey: ["contact_messages"],
    enabled: isVorstand,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data as any[];
    },
  });

  const inviteMember = useMutation({
    mutationFn: async () => {
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

  const updateMember = useMutation({
    mutationFn: async ({ userId, displayName, newRole }: { userId: string; displayName: string; newRole: string }) => {
      const { error } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_profile", userId, displayName },
      });
      if (error) throw error;
      const currentMember = members.find((m) => m.user_id === userId);
      if (currentMember && currentMember.role !== newRole) {
        const { error: roleErr } = await supabase.functions.invoke("manage-member", {
          body: { action: "update_role", userId, role: newRole },
        });
        if (roleErr) throw roleErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setEditingMember(null);
      toast({ title: "Mitglied aktualisiert" });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-member", {
        body: { action: "reset_password", userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Passwort-Reset", description: `Reset-Link wurde für ${data?.email || "den Benutzer"} generiert.` });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteContactMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("contact_messages" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_messages"] });
    },
  });

  const startEdit = (member: any) => {
    setEditingMember(member.user_id);
    setEditName(member.display_name);
    setEditRole(member.role);
  };

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-6">Verwaltung</h1>

        <div className="space-y-8">
          {/* Gallery - visible to Vorstand + Herold */}
          <GalleryAdmin />

          {/* Sources - visible to Vorstand + Herold */}
          <SourcesAdmin />

          {/* Member management - Vorstand only */}
          {isVorstand && (
            <>
              <div className="p-5 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-semibold">Mitgliederverwaltung</h2>
                  <Link
                    to="/intern/verwaltung/protokoll"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
                  >
                    <FileText size={16} /> Abstimmungsaudit
                  </Link>
                </div>

                {/* Invite form */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-sm">Neues Mitglied einladen</h3>
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
                      onChange={(e) => setRole(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
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

                {/* Members list */}
                <h3 className="font-semibold text-sm mb-3">Aktuelle Mitglieder</h3>
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-4">Laden...</div>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => {
                      const roleInfo = ROLES.find((r) => r.value === m.role) || ROLES[0];
                      const RoleIcon = roleInfo.icon;
                      const isEditing = editingMember === m.user_id;

                      return (
                        <div key={m.id} className="p-3 rounded-lg border bg-background">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Anzeigename"
                                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                />
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateMember.mutate({ userId: m.user_id, displayName: editName, newRole: editRole })}
                                  disabled={updateMember.isPending}
                                  className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={() => resetPassword.mutate(m.user_id)}
                                  disabled={resetPassword.isPending}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
                                >
                                  <KeyRound size={14} /> Passwort zurücksetzen
                                </button>
                                <button onClick={() => setEditingMember(null)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <RoleIcon size={16} className={m.role === "vorstand" ? "text-primary" : "text-muted-foreground"} />
                                <div>
                                  <span className="text-sm font-medium">{m.display_name}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{roleInfo.label}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => startEdit(m)} className="text-muted-foreground hover:text-foreground p-1" title="Bearbeiten">
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => removeMember.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1" title="Entfernen">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contact messages */}
              {contactMessages.length > 0 && (
                <div className="p-5 rounded-lg border bg-card">
                  <h2 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                    <Mail size={20} /> Kontaktnachrichten
                  </h2>
                  <div className="space-y-3">
                    {contactMessages.map((msg: any) => (
                      <div key={msg.id} className="p-3 rounded-lg border bg-background">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{msg.name} ({msg.email})</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleDateString("de-DE")} {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-sm mt-2">{msg.message}</p>
                          </div>
                          <button onClick={() => deleteContactMessage.mutate(msg.id)} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
