import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import type { AuditLogEntry } from "@/components/elections/types";

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const AuditLogPanel = () => {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("election_audit_log")
        .select("*")
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) return [];
      return data;
    },
  });

  const getDisplayName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name || "Unbekannt";

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Laden...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center text-muted-foreground py-12">Noch keine Protokolleinträge.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-prose mb-4">
        Wird eine abgeschlossene Abstimmung gelöscht, bleibt sie hier mit ihrem
        Ergebnis stehen. Das schützt vor allem die, die nichts falsch gemacht
        haben: Ein Ergebnis, das spurlos verschwinden kann, ist hinterher schwer
        zu verteidigen.
      </p>
      {entries.map((entry) => {
        const snapshot = entry.result_snapshot as Array<{ candidate: string; votes: number }> | null;
        return (
          <div key={entry.id} className="p-4 rounded-lg border">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-semibold">{entry.election_title}</h3>
                  {entry.group_title && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{entry.group_title}</span>
                  )}
                </div>
                {entry.election_description && (
                  <p className="text-sm text-muted-foreground mt-1">{entry.election_description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Gelöscht von <strong>{getDisplayName(entry.deleted_by)}</strong> am {formatTimestamp(entry.deleted_at)}
                </p>
                {snapshot && snapshot.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium">Ergebnis ({entry.total_votes} Stimmen):</p>
                    {snapshot.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-32 truncate">{r.candidate}</span>
                        <span className="font-medium">{r.votes} Stimmen</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditLogPanel;
