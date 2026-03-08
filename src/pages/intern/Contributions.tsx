import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const Contributions = () => {
  const { isVorstand, isSchatzmeister, user } = useAuth();
  const canEdit = isVorstand || isSchatzmeister;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["contribution-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id");
      const userIds = [...new Set(roles?.map((r) => r.user_id) || [])];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, is_active")
        .in("id", userIds);
      if (error) throw error;
      return data.filter((p) => p.is_active !== false);
    },
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("year", parseInt(selectedYear));
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (params: { userId: string; status: string; amount?: string; notes?: string }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const row = {
        user_id: params.userId,
        year: parseInt(selectedYear),
        status: params.status,
        amount: params.amount ? parseFloat(params.amount) : null,
        paid_at: params.status === "bezahlt" ? new Date().toISOString().split("T")[0] : null,
        notes: params.notes || null,
        updated_by: authUser!.id,
        updated_at: new Date().toISOString(),
      };

      const existing = contributions.find((c: any) => c.user_id === params.userId);
      if (existing) {
        const { error } = await supabase.from("contributions").update(row).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contributions").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contributions", selectedYear] });
      setEditingId(null);
      toast({ title: "Gespeichert" });
    },
  });

  const memberRows = useMemo(() => {
    return profiles.map((p: any) => {
      const contrib = contributions.find((c: any) => c.user_id === p.id);
      return {
        userId: p.id,
        name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name,
        status: contrib?.status || "offen",
        amount: contrib?.amount,
        paidAt: contrib?.paid_at,
        notes: contrib?.notes,
        contribId: contrib?.id,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, contributions]);

  const paidCount = memberRows.filter((m) => m.status === "bezahlt").length;

  // Non-admin members only see their own status
  if (!canEdit) {
    const myRow = memberRows.find((m) => m.userId === user?.id);
    return (
      <div className="container py-8 sm:py-12 max-w-3xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6">Mein Beitragsstatus</h1>
          <div className="space-y-3">
            {YEARS.map((y) => (
              <div key={y} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <span className="font-medium text-sm">{y}</span>
                <StatusBadge status={y === parseInt(selectedYear) ? (myRow?.status || "offen") : "—"} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Beitragsübersicht</h1>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {paidCount} von {memberRows.length} bezahlt
        </p>

        <div className="space-y-2">
          {memberRows.map((m) => (
            <div key={m.userId} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                {m.amount && (
                  <p className="text-xs text-muted-foreground">{Number(m.amount).toFixed(2)} €{m.notes ? ` · ${m.notes}` : ""}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={m.status} />
                {editingId === m.userId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Betrag"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-20 h-8 text-xs"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => upsertMutation.mutate({
                        userId: m.userId,
                        status: "bezahlt",
                        amount: editAmount,
                        notes: editNotes,
                      })}
                    >
                      <Check size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {m.status !== "bezahlt" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(m.userId);
                          setEditAmount(m.amount ? String(m.amount) : "");
                          setEditNotes(m.notes || "");
                        }}
                      >
                        <Pencil size={12} className="mr-1" /> Bezahlt
                      </Button>
                    )}
                    {m.status === "bezahlt" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => upsertMutation.mutate({ userId: m.userId, status: "offen" })}
                      >
                        Zurücksetzen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "bezahlt") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Bezahlt</Badge>;
  if (status === "offen") return <Badge variant="outline" className="text-xs">Offen</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
};

export default Contributions;
