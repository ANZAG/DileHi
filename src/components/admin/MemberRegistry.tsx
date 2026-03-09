import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, User, Pencil, KeyRound, X, Crown, Coins, Search, UserX, Upload, Download, FileText } from "lucide-react";

const ROLES = [
  { value: "mitglied", label: "Mitglied", icon: User },
  { value: "vorstand", label: "Vorstand", icon: Shield },
  { value: "herold", label: "Herold", icon: Crown },
  { value: "schatzmeister", label: "Schatzmeister", icon: Coins },
];

const MemberRegistry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("mitglied");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editExitDate, setEditExitDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      // Fetch emails via edge function
      let emailMap: Record<string, string> = {};
      try {
        const { data: emails } = await supabase.functions.invoke("manage-member", {
          body: { action: "get_emails", userIds },
        });
        if (emails) emailMap = emails;
      } catch {}

      return roles.map((r) => {
        const profile = profiles?.find((p) => p.id === r.user_id);
        return {
          ...r,
          display_name: profile?.display_name ?? "–",
          first_name: profile?.first_name ?? "",
          last_name: profile?.last_name ?? "",
          entry_date: profile?.entry_date ?? "",
          exit_date: profile?.exit_date ?? "",
          is_active: profile?.is_active ?? true,
          email: emailMap[r.user_id] ?? "",
        };
      });
    },
  });

  const filteredMembers = members
    .filter((m) => {
      const matchesSearch = !search || 
        m.display_name.toLowerCase().includes(search.toLowerCase()) ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || 
        (filter === "active" && m.is_active) || 
        (filter === "inactive" && !m.is_active);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));

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
    mutationFn: async ({ userId, displayName, newRole, entryDate, exitDate, isActive }: {
      userId: string; displayName: string; newRole: string;
      entryDate: string; exitDate: string; isActive: boolean;
    }) => {
      // Update profile name
      const { error } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_profile", userId, displayName },
      });
      if (error) throw error;

      // Update entry/exit dates and active status via edge function
      const { error: dateErr } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_membership", userId, entryDate: entryDate || null, exitDate: exitDate || null, isActive },
      });
      if (dateErr) throw dateErr;

      // Update role if changed
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

  const markAsExited = useMutation({
    mutationFn: async (userId: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_membership", userId, exitDate: today, isActive: false },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Mitglied als ausgetreten markiert" });
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

  // Upload membership application file
  const uploadMembershipFile = async (userId: string, file: File) => {
    const path = `membership/${userId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("internal-files").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload-Fehler", description: uploadErr.message, variant: "destructive" });
      return;
    }
    const { error: insertErr } = await supabase.from("membership_files").insert({
      user_id: userId,
      name: file.name,
      storage_path: path,
      uploaded_by: user?.id,
    });
    if (insertErr) {
      toast({ title: "Fehler", description: insertErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mitgliedsantrag hochgeladen" });
  };

  const startEdit = (member: any) => {
    setEditingMember(member.user_id);
    setEditName(member.display_name);
    setEditRole(member.role);
    setEditEntryDate(member.entry_date || "");
    setEditExitDate(member.exit_date || "");
    setEditIsActive(member.is_active);
  };

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Neues Mitglied einladen</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1 sm:flex-none"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={() => email && inviteMember.mutate()}
              disabled={!email || inviteMember.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
            >
              <UserPlus size={16} /> Einladen
            </button>
          </div>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Mitglied suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Alle</option>
          <option value="active">Aktive</option>
          <option value="inactive">Ausgetreten</option>
        </select>
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-4">Laden...</div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((m) => {
            const roleInfo = ROLES.find((r) => r.value === m.role) || ROLES[0];
            const RoleIcon = roleInfo.icon;
            const isEditing = editingMember === m.user_id;

            return (
              <div key={m.id} className={`p-3 rounded-lg border bg-background ${!m.is_active ? "opacity-60" : ""}`}>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Eintrittsdatum</label>
                        <input
                          type="date"
                          value={editEntryDate}
                          onChange={(e) => setEditEntryDate(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Austrittsdatum</label>
                        <input
                          type="date"
                          value={editExitDate}
                          onChange={(e) => setEditExitDate(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        className="rounded"
                      />
                      Aktives Mitglied
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateMember.mutate({
                          userId: m.user_id, displayName: editName, newRole: editRole,
                          entryDate: editEntryDate, exitDate: editExitDate, isActive: editIsActive,
                        })}
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
                        <KeyRound size={14} /> Passwort
                      </button>
                      <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted cursor-pointer">
                        <Upload size={14} /> Antrag
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadMembershipFile(m.user_id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button onClick={() => setEditingMember(null)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <RoleIcon size={16} className={m.role === "vorstand" ? "text-primary" : "text-muted-foreground"} />
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{m.display_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{roleInfo.label}</span>
                        {m.entry_date && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            seit {new Date(m.entry_date).toLocaleDateString("de-DE")}
                          </span>
                        )}
                        {!m.is_active && (
                          <span className="ml-2 text-xs text-destructive">ausgetreten</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(m)} className="text-muted-foreground hover:text-foreground p-1" title="Bearbeiten">
                        <Pencil size={16} />
                      </button>
                      {m.is_active && (
                        <button
                          onClick={() => {
                            if (confirm("Mitglied als ausgetreten markieren?")) markAsExited.mutate(m.user_id);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Als ausgetreten markieren"
                        >
                          <UserX size={16} />
                        </button>
                      )}
                      <button onClick={() => removeMember.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1" title="Rolle entfernen">
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
  );
};

export default MemberRegistry;
