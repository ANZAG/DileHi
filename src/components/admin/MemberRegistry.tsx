import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, Shield, User, KeyRound, Crown, Coins, Search,
  Upload, FileText, Trash2, RotateCcw, UserX, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Hilfe } from "@/components/Hilfe";
import { useDefaultRole } from "@/hooks/useDefaultRole";
import { invokeFunction } from "@/lib/functionError";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_ICONS: Record<string, React.ElementType> = {
  mitglied: User,
  vorstand: Shield,
  officiatus_1: Shield,
  officiatus_2: Shield,
  herold: Crown,
  schatzmeister: Coins,
};

type MemberData = {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  salutation: string;
  street: string;
  zip: string;
  city: string;
  entry_date: string;
  exit_date: string;
  is_active: boolean;
  contribution_interval: string;
  membership_type: string;
  birthdate: string;
};

const MemberRegistry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Role catalog – loaded once
  const { data: roleCatalog = [] } = useQuery({
    queryKey: ["role_catalog"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_role_catalog");
      return (data ?? []) as { key: string; label: string }[];
    },
  });

  const roleLabel = (role: string) =>
    roleCatalog.find((r) => r.key === role)?.label ?? role;

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  // Die Standardrolle kommt aus den Einstellungen: „mitglied" gibt es in einer
  // Installation mit eigenen Rollennamen womoeglich gar nicht.
  const defaultRole = useDefaultRole();
  const [inviteRole, setInviteRole] = useState("");
  useEffect(() => {
    if (!inviteRole && defaultRole) setInviteRole(defaultRole);
  }, [defaultRole, inviteRole]);

  // Filter/search/sort
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [sortKey, setSortKey] = useState<"display_name" | "role" | "email" | "city" | "entry_date" | "is_active">("display_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Detail dialog
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editExitDate, setEditExitDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete dialog
  const [deletingMember, setDeletingMember] = useState<MemberData | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  // Fetch members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = roles.map((r) => r.user_id);

      // Also fetch inactive profiles that may no longer have a user_roles row
      // (happens when they were deactivated and their role entry was removed)
      const [profilesResult, inactiveProfilesResult] = await Promise.all([
        supabase.from("profiles").select("*").in("id", userIds),
        supabase.from("profiles").select("*").eq("is_active", false),
      ]);

      const profiles = profilesResult.data ?? [];
      const inactiveProfiles = inactiveProfilesResult.data ?? [];

      // Members coming from user_roles (the normal path)
      const fromRoles: MemberData[] = roles.map((r) => {
        const p = profiles.find((pr) => pr.id === r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          display_name: p?.display_name ?? "–",
          first_name: p?.first_name ?? "",
          last_name: p?.last_name ?? "",
          email: "",
          phone: p?.phone ?? "",
          salutation: p?.salutation ?? "",
          street: p?.street ?? "",
          zip: p?.zip ?? "",
          city: p?.city ?? "",
          entry_date: p?.entry_date ?? "",
          exit_date: p?.exit_date ?? "",
          is_active: p?.is_active ?? true,
          contribution_interval: p?.contribution_interval ?? "",
          membership_type: p?.membership_type ?? "",
          birthdate: p?.birthdate ?? "",
        } as MemberData;
      });

      // Inactive profiles that lost their user_roles row – add them back as "ausgetreten"
      const activeIds = new Set(userIds);
      const orphans: MemberData[] = inactiveProfiles
        .filter((p) => !activeIds.has(p.id))
        .map((p) => ({
          id: p.id, // no user_roles id – use profile id
          user_id: p.id,
          role: defaultRole,
          display_name: p.display_name ?? "–",
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          email: "",
          phone: p.phone ?? "",
          salutation: p.salutation ?? "",
          street: p.street ?? "",
          zip: p.zip ?? "",
          city: p.city ?? "",
          entry_date: p.entry_date ?? "",
          exit_date: p.exit_date ?? "",
          is_active: false,
          contribution_interval: p.contribution_interval ?? "",
          membership_type: p.membership_type ?? "",
          birthdate: p.birthdate ?? "",
        } as MemberData));

      return [...fromRoles, ...orphans];
    },
  });

  /*
   * Die E-Mail-Adressen kommen aus einer Edge Function – sie stehen in der
   * Anmeldung, nicht im Profil.
   *
   * Frueher hing die ganze Liste daran: Die Funktion lief in demselben
   * Promise.all wie die Profile, und ihr Kaltstart dauert die ersten
   * Sekunden. Solange sah man einen Ladebalken, obwohl Namen, Rollen und
   * Status laengst da waren.
   *
   * Jetzt steht die Liste sofort, und die Adressen tragen sich nach. Faellt
   * die Funktion ganz aus, fehlt eine Spalte statt der ganzen Seite.
   */
  const { data: emailMap = {} } = useQuery({
    queryKey: ["member-emails"],
    queryFn: async (): Promise<Record<string, string>> => {
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return {};
      const data = await invokeFunction<Record<string, string> | null>("manage-member", {
        body: { action: "get_emails", userIds },
      });
      return data ?? {};
    },
    enabled: members.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const mitgliederMitMail = useMemo(
    () => members.map((m) => ({ ...m, email: emailMap[m.user_id] ?? "" })),
    [members, emailMap]
  );

  // Membership files
  const { data: membershipFiles = [] } = useQuery({
    queryKey: ["membership-files", selectedMember?.user_id],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_files")
        .select("*")
        .eq("user_id", selectedMember!.user_id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ column, label }: { column: typeof sortKey; label: string }) => (
    <button
      onClick={() => toggleSort(column)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === column ? (
        sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
      ) : (
        <ArrowUpDown size={14} className="opacity-40" />
      )}
    </button>
  );

  const filteredMembers = mitgliederMitMail
    .filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        m.display_name.toLowerCase().includes(q) ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && m.is_active) ||
        (filter === "inactive" && !m.is_active);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "display_name":
          return dir * a.display_name.localeCompare(b.display_name, "de");
        case "role":
          return dir * roleLabel(a.role).localeCompare(roleLabel(b.role), "de");
        case "email":
          return dir * (a.email || "").localeCompare(b.email || "", "de");
        case "city":
          return dir * (a.city || "").localeCompare(b.city || "", "de");
        case "entry_date":
          return dir * (a.entry_date || "").localeCompare(b.entry_date || "");
        case "is_active":
          return dir * (Number(b.is_active) - Number(a.is_active));
        default:
          return 0;
      }
    });

  // --- Mutations ---

  const inviteMember = useMutation({
    mutationFn: async () => {
      return await invokeFunction("invite-member", {
        body: { email: inviteEmail, role: inviteRole },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setInviteEmail("");
      toast({ title: "Einladung versendet" });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!selectedMember) return;
      const userId = selectedMember.user_id;

      if (editDisplayName !== selectedMember.display_name) {
        await invokeFunction("manage-member", {
          body: { action: "update_profile", userId, displayName: editDisplayName },
        });
      }

      if (selectedMember.role !== editRole) {
        await invokeFunction("manage-member", {
          body: { action: "update_role", userId, role: editRole },
        });
      }

      await invokeFunction("manage-member", {
        body: {
          action: "update_membership",
          userId,
          entryDate: editEntryDate || null,
          exitDate: editExitDate || null,
          isActive: editIsActive,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setSelectedMember(null);
      toast({ title: "Mitglied aktualisiert" });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deactivateMember = useMutation({
    mutationFn: async (m: MemberData) => {
      const today = new Date().toISOString().slice(0, 10);
      // Erst das Austrittsdatum, dann die Rolle. Bisher wurde die Rolle auch
      // gelöscht, wenn das Datum nicht gespeichert war – ohne Meldung.
      await invokeFunction("manage-member", {
        body: { action: "update_membership", userId: m.user_id, exitDate: today, isActive: false },
      });
      const { error } = await supabase.from("user_roles").delete().eq("user_id", m.user_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setSelectedMember(null);
      toast({ title: "Mitglied deaktiviert", description: "Der Zugang zum Mitgliederbereich ist gesperrt." });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const reactivateMember = useMutation({
    mutationFn: async (m: MemberData) => {
      await invokeFunction("manage-member", {
        body: { action: "update_role", userId: m.user_id, role: defaultRole },
      });
      await invokeFunction("manage-member", {
        body: { action: "update_membership", userId: m.user_id, exitDate: null, isActive: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setSelectedMember(null);
      toast({ title: "Mitglied reaktiviert", description: "Der Zugang zum Mitgliederbereich steht wieder offen." });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      return await invokeFunction<{ email?: string }>("manage-member", {
        body: { action: "reset_password", userId },
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Passwort-Reset", description: `Reset-Link wurde an ${data?.email || "den Benutzer"} gesendet.` });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async () => {
      if (!deletingMember || !reassignTo) return;
      await invokeFunction("manage-member", {
        body: {
          action: "delete_user",
          userId: deletingMember.user_id,
          reassignToUserId: reassignTo,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setDeletingMember(null);
      setReassignTo("");
      setSelectedMember(null);
      toast({ title: "Benutzer gelöscht und Vorgänge übertragen" });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const uploadMembershipFile = async (userId: string, file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `membership/${userId}/${Date.now()}_${safeName}`;
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
    queryClient.invalidateQueries({ queryKey: ["membership-files", userId] });
    toast({ title: "Mitgliedsantrag hochgeladen" });
  };

  const downloadFile = async (storagePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("internal-files").createSignedUrl(storagePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const openMemberDetail = (m: MemberData) => {
    setSelectedMember(m);
    setEditRole(m.role);
    setEditDisplayName(m.display_name);
    setEditEntryDate(m.entry_date || "");
    setEditExitDate(m.exit_date || "");
    setEditIsActive(m.is_active);
  };

  const contributionLabel = (val: string) => {
    const map: Record<string, string> = {
      jaehrlich: "Jährlich", halbjaehrlich: "Halbjährlich",
      vierteljaehrlich: "Vierteljährlich", monatlich: "Monatlich",
    };
    return map[val] || val || "–";
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("de-DE") : "–";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-prose">
        Das Register aller Mitglieder. Die Liste sieht aus wie eine Tabelle, ist
        aber eine Kartei: Ein Klick auf eine Zeile öffnet das Mitglied mit allen
        Daten, seiner Rolle, dem Eintrittsdatum und dem Aufnahmeantrag. Dort wird
        auch geändert.
      </p>

      {/* Invite form */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">
          Neues Mitglied einladen<Hilfe k="einladung_rolle" />
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="E-Mail-Adresse"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1 sm:flex-none"
            >
              {roleCatalog.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <Button
              onClick={() => inviteEmail && inviteMember.mutate()}
              disabled={!inviteEmail || inviteMember.isPending}
              size="default"
            >
              <UserPlus size={16} /> Einladen
            </Button>
          </div>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name oder E-Mail suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="active">Aktive</option>
          <option value="all">Alle</option>
          <option value="inactive">Ausgetreten</option>
        </select>
      </div>

      {/* Members table */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="hidden md:block">
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-3 border-b bg-muted/30">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className="grid grid-cols-6 gap-4 p-3 border-b last:border-0">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-5 bg-muted animate-pulse rounded-full w-20" />
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-2 w-2 bg-muted animate-pulse rounded-full mx-auto" />
                </div>
              ))}
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                  <div className="h-5 bg-muted animate-pulse rounded-full w-16" />
                </div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">Keine Mitglieder gefunden</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader column="display_name" label="Name" /></TableHead>
                  <TableHead><SortHeader column="role" label="Rolle" /></TableHead>
                  <TableHead><SortHeader column="email" label="E-Mail" /></TableHead>
                  <TableHead><SortHeader column="city" label="Ort" /></TableHead>
                  <TableHead><SortHeader column="entry_date" label="Eintritt" /></TableHead>
                  <TableHead className="w-[80px]"><SortHeader column="is_active" label="Status" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => (
                  <TableRow
                    key={m.id}
                    onClick={() => openMemberDetail(m)}
                    className={`cursor-pointer ${!m.is_active ? "opacity-60" : ""}`}
                  >
                    <TableCell className="font-medium">{m.display_name}</TableCell>
                    <TableCell>
                      <Badge variant={["officiatus_1", "officiatus_2", "schatzmeister"].includes(m.role) ? "default" : "secondary"} className="text-xs">
                        {roleLabel(m.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.email || "–"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.city || "–"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(m.entry_date)}</TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Aktiv" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-destructive" title="Ausgetreten" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => openMemberDetail(m)}
                className={`w-full text-left p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow ${!m.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.display_name}</span>
                      <Badge variant={["officiatus_1", "officiatus_2", "schatzmeister"].includes(m.role) ? "default" : "secondary"} className="text-xs shrink-0">
                        {roleLabel(m.role)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {m.email || "Keine E-Mail"} {m.city ? `· ${m.city}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.is_active ? (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                    )}
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {filteredMembers.length} von {members.length} Mitgliedern
          </p>
        </>
      )}

      {/* ---- Detail Dialog ---- */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMember?.display_name}
              {selectedMember && !selectedMember.is_active && (
                <Badge variant="destructive" className="text-xs">Ausgetreten</Badge>
              )}
            </DialogTitle>
            <DialogDescription>Mitgliedsdetails und Verwaltung</DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-5">
              {/* Personal data */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Persönliche Daten</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-muted-foreground">Anzeigename</span>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="h-7 text-sm"
                  />
                  <span className="text-muted-foreground">Vor-/Nachname</span>
                  <span>{selectedMember.first_name || selectedMember.last_name ? `${selectedMember.first_name} ${selectedMember.last_name}`.trim() : "–"}</span>
                  <span className="text-muted-foreground">E-Mail</span>
                  <span className="break-all">{selectedMember.email || "–"}</span>
                  <span className="text-muted-foreground">Telefon</span>
                  <span>{selectedMember.phone || "–"}</span>
                  <span className="text-muted-foreground">Adresse</span>
                  <span>{selectedMember.street ? `${selectedMember.street}, ${selectedMember.zip} ${selectedMember.city}` : "–"}</span>
                  <span className="text-muted-foreground">Geburtsdatum</span>
                  <span>{formatDate(selectedMember.birthdate)}</span>
                  <span className="text-muted-foreground">Beitragszyklus</span>
                  <span>{contributionLabel(selectedMember.contribution_interval)}</span>
                </div>
              </div>

              {/* Editable fields */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mitgliedschaft verwalten</h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="mr-role" className="text-xs text-muted-foreground">Rolle</label>
                    <select id="mr-role"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
                    >
                      {roleCatalog.map((r) => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Untereinander auf dem Handy: zwei Datumsfelder
                      nebeneinander sind dort je 150 px breit, und das reicht
                      fuer TT.MM.JJJJ samt Kalendersymbol nicht. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="mr-join-date" className="text-xs text-muted-foreground">Eintrittsdatum</label>
                      <Input id="mr-join-date"
                        type="date"
                        value={editEntryDate}
                        onChange={(e) => setEditEntryDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    {!editIsActive && (
                      <div>
                        <label htmlFor="mr-leave-date" className="text-xs text-muted-foreground">Austrittsdatum</label>
                        <Input id="mr-leave-date"
                          type="date"
                          value={editExitDate}
                          onChange={(e) => setEditExitDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Membership files */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mitgliedsantrag</h4>
                {membershipFiles.length > 0 ? (
                  <div className="space-y-1">
                    {membershipFiles.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => downloadFile(f.storage_path, f.name)}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText size={14} /> {f.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Noch kein Antrag hochgeladen</p>
                )}
                <label className="inline-flex items-center gap-1 px-3 py-1.5 mt-2 text-xs rounded-md border hover:bg-muted cursor-pointer">
                  <Upload size={14} /> Antrag hochladen
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMembershipFile(selectedMember.user_id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t space-y-2">
                {!editIsActive && selectedMember.is_active && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
                    Austrittsdatum prüfen und dann <strong>Speichern</strong> klicken, um die Deaktivierung zu übernehmen.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => updateMember.mutate()} disabled={updateMember.isPending}>
                    Speichern
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    onClick={() => resetPassword.mutate(selectedMember.user_id)}
                    disabled={resetPassword.isPending}
                  >
                    <KeyRound size={14} /> Passwort-Reset
                  </Button>
                </div>
                <div className="flex gap-2">
                  {selectedMember.is_active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setEditIsActive(false);
                        if (!editExitDate) setEditExitDate(today);
                      }}
                      disabled={deactivateMember.isPending}
                    >
                      <UserX size={14} /> Deaktivieren
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Mitglied reaktivieren? Es erhält wieder Zugang als Mitglied.")) {
                          reactivateMember.mutate(selectedMember);
                        }
                      }}
                      disabled={reactivateMember.isPending}
                    >
                      <RotateCcw size={14} /> Reaktivieren
                    </Button>
                  )}
                  {selectedMember.user_id !== user?.id && (
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingMember(selectedMember)}
                    >
                      <Trash2 size={14} /> Löschen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Delete/Reassign Dialog ---- */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => { if (!open) { setDeletingMember(null); setReassignTo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer endgültig löschen</DialogTitle>
            <DialogDescription>
              <strong>{deletingMember?.display_name}</strong> wird unwiderruflich gelöscht.
              Alle verknüpften Vorgänge (Ankündigungen, Quellen, Events etc.) werden auf ein anderes Mitglied übertragen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="mr-transfer" className="text-sm font-medium">Vorgänge übertragen auf:</label>
              <select id="mr-transfer"
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="">– Mitglied wählen –</option>
                {members
                  .filter((m) => m.user_id !== deletingMember?.user_id && m.is_active)
                  .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"))
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingMember(null); setReassignTo(""); }}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={!reassignTo || deleteUser.isPending}
              onClick={() => {
                if (confirm(`${deletingMember?.display_name} ENDGÜLTIG löschen? Dies kann nicht rückgängig gemacht werden!`)) {
                  deleteUser.mutate();
                }
              }}
            >
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberRegistry;
