import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const RolesPermissionsPanel = () => {
  const queryClient = useQueryClient();
  const { startImpersonation } = useAuth();

  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const { data: rolePermissions = [], isLoading: rpLoading } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: roleCatalog = [], isLoading: rcLoading } = useQuery({
    queryKey: ["role_catalog"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_role_catalog");
      return (data ?? []) as { key: string; label: string }[];
    },
  });

  const { data: permCatalog = [], isLoading: pcLoading } = useQuery({
    queryKey: ["permission_catalog"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_permission_catalog");
      return (data ?? []) as { key: string; label: string; category: string }[];
    },
  });

  const isLoading = rpLoading || rcLoading || pcLoading;

  const toggleMutation = useMutation({
    mutationFn: async ({ role, permission, granted }: { role: "herold" | "mitglied" | "schatzmeister" | "officiatus_1" | "officiatus_2"; permission: string; granted: boolean }) => {
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

  const isGranted = (role: string, permission: string) =>
    rolePermissions.some((rp) => rp.role === role && rp.permission === permission && rp.granted);

  const categories = [...new Set(permCatalog.map((p) => p.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Impersonation buttons */}
      <div className="mb-6 p-4 rounded-lg border bg-muted/30">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Eye size={16} /> Ansicht testen als:
        </p>
        <div className="flex flex-wrap gap-2">
          {roleCatalog.filter((role) => role.key !== "officiatus_1" && role.key !== "officiatus_2").map((role) => (
            <Button
              key={role.key}
              variant="outline"
              size="sm"
              onClick={() => startImpersonation(role.key)}
            >
              {role.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Du siehst dann die App aus Sicht dieser Rolle. Oben erscheint ein Banner zum Zurückwechseln.
        </p>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-semibold min-w-[220px]">Berechtigung</th>
              {roleCatalog.map((role) => (
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
                  <td colSpan={roleCatalog.length + 1} className="px-3 pt-4 pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</span>
                  </td>
                </tr>
                {permCatalog.filter((p) => p.category === cat).map((perm) => (
                  <tr key={perm.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground">{perm.label}</td>
                    {roleCatalog.map((role) => {
                      const toggleKey = `${role.key}:${perm.key}`;
                      const isPending = pendingToggles.has(toggleKey);
                      const granted = isGranted(role.key, perm.key);
                      return (
                        <td key={role.key} className="p-3 text-center">
                          <Switch
                            checked={granted}
                            disabled={isPending}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ role: role.key as "herold" | "mitglied" | "schatzmeister" | "officiatus_1" | "officiatus_2", permission: perm.key, granted: checked })
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
      <p className="text-xs text-muted-foreground mt-4">
        Änderungen werden sofort wirksam. Die Sicherheitsrichtlinien in der Datenbank prüfen
        Berechtigungen dynamisch bei jedem Zugriff.
      </p>
    </div>
  );
};

export default RolesPermissionsPanel;
