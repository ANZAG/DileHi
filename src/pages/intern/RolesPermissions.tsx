import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const ROLES = [
  { key: "vorstand" as const, label: "Vorstand" },
  { key: "herold" as const, label: "Herold" },
  { key: "schatzmeister" as const, label: "Schatzmeister" },
  { key: "mitglied" as const, label: "Mitglied" },
] as const;

const ALL_PERMISSIONS = [
  { key: "admin.access", label: "Verwaltungsbereich öffnen", category: "Allgemein" },
  { key: "roles.manage", label: "Rollen & Berechtigungen verwalten", category: "Allgemein" },
  { key: "audit.view", label: "Audit-Log einsehen", category: "Allgemein" },
  { key: "members.manage", label: "Mitglieder verwalten", category: "Mitglieder" },
  { key: "profiles.view_all", label: "Alle Profile einsehen", category: "Mitglieder" },
  { key: "membership_files.manage", label: "Mitgliedsunterlagen verwalten", category: "Mitglieder" },
  { key: "membership_files.view", label: "Mitgliedsunterlagen einsehen", category: "Mitglieder" },
  { key: "gallery.manage", label: "Galerie verwalten", category: "Inhalte" },
  { key: "epoch_sources.manage", label: "Epochen-Quellen verwalten", category: "Inhalte" },
  { key: "visitor_highlights.manage", label: "Besucher-Highlights verwalten", category: "Inhalte" },
  { key: "site_images.manage", label: "Seitenbilder verwalten", category: "Inhalte" },
  { key: "contacts.view", label: "Kontaktanfragen sehen", category: "Kontakt" },
  { key: "contacts.reply", label: "Kontaktanfragen beantworten", category: "Kontakt" },
  { key: "contacts.delete", label: "Kontaktanfragen löschen", category: "Kontakt" },
  { key: "documents.manage", label: "Dokumente verwalten", category: "Verein" },
  { key: "elections.manage", label: "Abstimmungen verwalten", category: "Verein" },
  { key: "contributions.manage", label: "Beiträge verwalten", category: "Finanzen" },
  { key: "announcements.moderate", label: "Pinnwand moderieren", category: "Kommunikation" },
  { key: "events.moderate", label: "Veranstaltungen moderieren", category: "Kommunikation" },
];

type RoleKey = (typeof ROLES)[number]["key"];

const RolesPermissions = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  if (!hasPermission("roles.manage")) return <Navigate to="/intern" replace />;

  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ role, permission, granted }: { role: RoleKey; permission: string; granted: boolean }) => {
      if (granted) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role, permission, granted: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission", permission);
        if (error) throw error;
      }
    },
    onMutate: ({ role, permission }) => {
      setPendingToggles((prev) => new Set(prev).add(`${role}:${permission}`));
    },
    onSettled: (_data, _err, { role, permission }) => {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(`${role}:${permission}`);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
    },
    onError: (err) => {
      toast({ title: "Fehler", description: (err as Error).message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Berechtigung aktualisiert" });
    },
  });

  const isGranted = (role: RoleKey, permission: string) =>
    rolePermissions.some((rp) => rp.role === role && rp.permission === permission && rp.granted);

  const categories = [...new Set(ALL_PERMISSIONS.map((p) => p.category))];

  return (
    <div className="container py-8 sm:py-12 max-w-5xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Link to="/intern/verwaltung" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-primary" />
            <h1 className="font-serif text-2xl font-bold">Rollen & Berechtigungen</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold min-w-[220px]">Berechtigung</th>
                  {ROLES.map((role) => (
                    <th key={role.key} className="p-3 text-center font-semibold min-w-[100px]">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={ROLES.length + 1} className="px-3 pt-4 pb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</span>
                      </td>
                    </tr>
                    {ALL_PERMISSIONS.filter((p) => p.category === cat).map((perm) => (
                      <tr key={perm.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-foreground">{perm.label}</td>
                        {ROLES.map((role) => {
                          const toggleKey = `${role.key}:${perm.key}`;
                          const isPending = pendingToggles.has(toggleKey);
                          const granted = isGranted(role.key, perm.key);
                          return (
                            <td key={role.key} className="p-3 text-center">
                              <Switch
                                checked={granted}
                                disabled={isPending}
                                onCheckedChange={(checked) =>
                                  toggleMutation.mutate({ role: role.key, permission: perm.key, granted: checked })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Änderungen werden sofort wirksam. Die RLS-Sicherheitsrichtlinien in der Datenbank prüfen
          Berechtigungen dynamisch bei jedem Zugriff. Die Verwaltung dieser Seite bleibt dem Vorstand
          vorbehalten (fest kodiert als Sicherheitsmaßnahme).
        </p>
      </motion.div>
    </div>
  );
};

export default RolesPermissions;
