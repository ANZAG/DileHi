import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import type { AuditLogEntry } from "@/components/elections/types";

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const AuditLog = () => {
  const { isVorstand } = useAuth();

  if (!isVorstand) return <Navigate to="/intern" replace />;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("election_audit_log" as any)
        .select("*")
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AuditLogEntry[];
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

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern/verwaltung" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück zur Verwaltung
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-6">Abstimmungs-Protokoll</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Hier werden gelöschte, geschlossene Abstimmungen mit ihrem Ergebnis protokolliert.
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Noch keine Protokolleinträge.</div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const snapshot = entry.result_snapshot as Array<{ candidate: string; votes: number }> | null;
              return (
                <div key={entry.id} className="p-4 rounded-lg border bg-card">
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
        )}
      </motion.div>
    </div>
  );
};

export default AuditLog;
